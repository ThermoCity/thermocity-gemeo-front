import type { EstadoGemeo, PessoaLista, Servico, SetoresGeoJson, SituacaoClima, StatusContato, Usuario } from '../types'

/**
 * Dados DEMONSTRATIVOS enquanto as APIs não estão prontas (arquivos em public/mocks).
 * - Setores, nota de calor, IPVS, UBS e refúgios: dados reais (Censo 2022, IPVS 2022, Landsat, CNES, OSM).
 * - Nível de calor, lista do dia e contatos: fictícios, só para montar a interface.
 */
const carregarJson = async <T,>(arquivo: string): Promise<T> => {
  const r = await fetch(`${import.meta.env.BASE_URL}mocks/${arquivo}`)
  if (!r.ok) throw new Error(`Mock ${arquivo} não encontrado`)
  return r.json() as Promise<T>
}

let cache: Promise<{ setores: SetoresGeoJson; servicos: Servico[]; lista: PessoaLista[] }> | null = null
const dadosBase = () => {
  cache ??= Promise.all([carregarJson<SetoresGeoJson>('setores.geo.json'), carregarJson<Servico[]>('servicos.json')]).then(
    ([setores, servicos]) => ({ setores, servicos, lista: montarLista(setores, servicos) }),
  )
  return cache
}

const espera = <T,>(valor: T, ms = 250) => new Promise<T>((ok) => setTimeout(() => ok(valor), ms))

const agora = () => new Date().toISOString()
const dia = (deslocamento: number) => {
  const d = new Date()
  d.setDate(d.getDate() + deslocamento)
  return d.toISOString().slice(0, 10)
}

function montarLista(setores: SetoresGeoJson, servicos: Servico[]): PessoaLista[] {
  const ubsList = servicos.filter((s) => s.tipo === 'UBS')
  const ubsMaisProxima = (f: SetoresGeoJson['features'][number]) => {
    const anel = f.geometry.coordinates[0][0]
    const lon = anel.reduce((t, c) => t + c[0], 0) / anel.length
    const lat = anel.reduce((t, c) => t + c[1], 0) / anel.length
    let melhor = ubsList[0]
    let menor = Infinity
    for (const u of ubsList) {
      const d = (u.lon - lon) ** 2 + (u.lat - lat) ** 2
      if (d < menor) [menor, melhor] = [d, u]
    }
    return melhor?.nome ?? 'UBS de referência'
  }
  const candidatos = setores.features
    .filter((f) => f.properties.classeCalor === 5)
    .map((f) => ({ ...f.properties, ubs: ubsMaisProxima(f) }))
    .filter((p) => p.classeCalor === 5 && (p.ipvsGrupo ?? 0) >= 3 && (p.pop70mais ?? 0) > 0)
    .slice(0, 12)
  const status: StatusContato[] = ['PENDENTE', 'PENDENTE', 'CONTATADO', 'PRECISA_AJUDA', 'PENDENTE', 'NAO_ATENDEU']
  return candidatos
    .map((p, i) => {
      const motivos = ['70+ anos', `setor nota de calor ${p.classeCalor}`]
      if (i % 2 === 0) motivos.unshift('mora sozinha')
      if (i % 3 === 0) motivos.push('mobilidade reduzida')
      if ((p.ipvsGrupo ?? 0) >= 4) motivos.push(`IPVS ${p.ipvsGrupo}`)
      return {
        posicao: 0,
        pessoaId: `demo-${i + 1}`,
        rotulo: `Pessoa ${String(i + 1).padStart(3, '0')}`,
        setorCodigo: p.codigo,
        ubs: p.ubs,
        pontuacao: 4 + motivos.length + (i % 3),
        motivos,
        status: status[i % status.length],
      }
    })
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .map((p, i) => ({ ...p, posicao: i + 1 }))
}

export const mockApi = {
  usuarioAtual: () => espera<Usuario>({ nome: 'Gestor demonstração', email: 'gestor@thermocity.demo', papel: 'GESTOR' }, 50),
  setoresGeoJson: () => dadosBase().then((d) => espera(d.setores)),
  servicos: () => dadosBase().then((d) => espera(d.servicos)),
  situacaoAtual: () =>
    espera<SituacaoClima>({
      hoje: { data: dia(0), nivel: 3, nome: 'Alerta', icMaxC: 36.2, origem: 'PREVISTO' },
      proximosDias: [
        { data: dia(1), nivel: 3, nome: 'Alerta', icMaxC: 35.8, origem: 'PREVISTO' },
        { data: dia(2), nivel: 4, nome: 'Alto risco', icMaxC: 37.1, origem: 'PREVISTO' },
        { data: dia(3), nivel: 2, nome: 'Atenção', icMaxC: 35.1, origem: 'PREVISTO' },
      ],
      criterio: 'Índice de calor máximo ≥ 36,0 °C',
      acaoEsperada: 'Inicia a busca ativa: idosos 70+ nos setores de IPVS 5–6; divulgar refúgios.',
      atualizadoEm: agora(),
      desatualizado: false,
    }),
  estado: () =>
    dadosBase().then(({ setores, lista }) => espera<EstadoGemeo>({
      pessoasNaLista: lista.length,
      contatadas: lista.filter((p) => p.status === 'CONTATADO' || p.status === 'PRECISA_AJUDA').length,
      precisaAjuda: lista.filter((p) => p.status === 'PRECISA_AJUDA').length,
      semRefugioProximo: Math.round(lista.length / 3),
      setoresNota5: setores.features.filter((f) => f.properties.classeCalor === 5).length,
      atualizadoEm: agora(),
    })),
  listaDoDia: () => dadosBase().then((d) => espera(d.lista)),
}
