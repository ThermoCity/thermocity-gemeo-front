import type {
  CenarioSimulacao,
  DiaModelo,
  ModeloOndaCalor,
  ModelosOndaCalor,
  NivelCalor,
  PessoaLista,
  Servico,
  ServicoProximo,
  ServicosDoSetor,
  SetoresGeoJson,
  SetorSimulado,
  SimulacaoDetalhe,
  SimulacaoResumo,
  SituacaoClima,
  StatusContato,
} from '../types'
import { coberturaDaLista } from './coberturaDemo'

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
  if (!cache) {
    cache = Promise.all([carregarJson<SetoresGeoJson>('setores.geo.json'), carregarJson<Servico[]>('servicos.json')]).then(
      ([setores, servicos]) => ({ setores, servicos, lista: montarLista(setores, servicos) }),
    )
    // Falhou: descarta, para o "Tentar de novo" buscar os arquivos outra vez.
    cache.catch(() => {
      cache = null
    })
  }
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
  const status: StatusContato[] = ['PENDENTE', 'PENDENTE', 'CONTATADO_BEM', 'PRECISA_AJUDA', 'PENDENTE', 'NAO_ATENDEU']
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

/** Distância em linha reta (fórmula de haversine), em metros. */
function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(a))
}

function maisProximo(candidatos: Servico[], lat: number, lon: number): ServicoProximo | null {
  let melhor: ServicoProximo | null = null
  for (const s of candidatos) {
    const d = Math.round(distanciaMetros(lat, lon, s.lat, s.lon))
    if (!melhor || d < (melhor.distanciaMetros ?? Infinity)) melhor = { ...s, distanciaMetros: d }
  }
  return melhor
}

/* ---------------------------------------------------------------- simulação (só para uso offline) */

const NOMES_NC: Record<NivelCalor, string> = { 1: 'Normal', 2: 'Atenção', 3: 'Alerta', 4: 'Alto risco', 5: 'Emergência' }
/** Limiares A707 (1 dia / 3 dias seguidos), iguais aos da API. */
const REGRAS: { nivel: NivelCalor; ic: number; dias: number }[] = [
  { nivel: 5, ic: 38.5, dias: 1 },
  { nivel: 5, ic: 37.0, dias: 3 },
  { nivel: 4, ic: 37.0, dias: 1 },
  { nivel: 4, ic: 36.0, dias: 3 },
  { nivel: 3, ic: 36.0, dias: 1 },
  { nivel: 3, ic: 35.0, dias: 3 },
  { nivel: 2, ic: 35.0, dias: 1 },
]
const MAX_HISTORICO_DEMO = 40.93

function niveis(ic: number[]): NivelCalor[] {
  return ic.map((_, i) => {
    const regra = REGRAS.find((r) => i - r.dias + 1 >= 0 && ic.slice(i - r.dias + 1, i + 1).every((v) => v >= r.ic))
    return regra?.nivel ?? 1
  })
}

/** Onda de calor DEMONSTRATIVA (valores inventados, só para usar o painel sem a API). */
const ONDA_DEMO = [34.8, 35.6, 36.9, 37.8, 38.9, 37.2, 35.1]

function modeloDemo(acrescimo: number): ModeloOndaCalor {
  const ic = ONDA_DEMO.map((v) => Math.round((v + acrescimo) * 100) / 100)
  const nc = niveis(ic)
  const dias: DiaModelo[] = ic.map((v, i) => ({
    dia: i + 1,
    data: `2024-03-${String(11 + i).padStart(2, '0')}`,
    icMaxC: v,
    nivel: nc[i],
    nome: NOMES_NC[nc[i]],
    parteDoEpisodio: i >= 2 && i <= 5,
    extrapolacao: v > MAX_HISTORICO_DEMO,
  }))
  return {
    id: `DEMO-2024-03-13${acrescimo ? `+${acrescimo}` : ''}`,
    nome: `Onda de calor demonstrativa${acrescimo ? ` + ${acrescimo} °C` : ''}`,
    tipo: acrescimo ? 'VARIACAO' : 'REAL',
    acrescimoC: acrescimo,
    inicioEpisodio: '2024-03-13',
    fimEpisodio: '2024-03-16',
    diasEpisodio: 4,
    nivelMaximo: Math.max(...nc) as NivelCalor,
    icMaxC: Math.max(...ic),
    diasExtrapolados: dias.filter((d) => d.extrapolacao).length,
    dias,
  }
}

const simulacoesDemo = new Map<number, SimulacaoDetalhe>()

/** Reparte os totais fictícios de cada dia entre os setores, pela população 60+ (só para a demonstração). */
function distribuirPorSetor(
  dias: SimulacaoDetalhe['dias'],
  geo: SetoresGeoJson,
  c: CenarioSimulacao,
): SetorSimulado[] {
  const setores = geo.features.filter((f) => !c.distrito || f.properties.distrito === c.distrito)
  const total = setores.reduce((t, f) => t + (f.properties.pop60mais ?? 0), 0) || 1
  const lst = setores.map((f) => f.properties.lstVeraoC).filter((v): v is number => v != null)
  const media = lst.reduce((t, v) => t + v, 0) / (lst.length || 1)
  return dias.flatMap((d) =>
    setores.map((f) => {
      const peso = (f.properties.pop60mais ?? 0) / total
      const lista = Math.round((d.pessoasNaLista ?? 0) * peso)
      const pendentes = Math.min(lista, Math.round((d.pendentes ?? 0) * peso))
      const p = f.properties
      return {
        dia: d.dia,
        codigoSetor: p.codigo,
        pessoasNaLista: lista,
        contatadas: lista - pendentes,
        pendentes,
        semRefugio800m: Math.min(lista, Math.round((d.semRefugio800m ?? 0) * peso)),
        icEstimadoC: p.lstVeraoC == null ? null : Math.round((d.icMaxC + c.fatorK * (p.lstVeraoC - media)) * 100) / 100,
      }
    }),
  )
}

export const mockApi = {
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
  cobertura: () => dadosBase().then(({ lista }) => espera(coberturaDaLista(lista, 3))),
  listaDoDia: () => dadosBase().then((d) => espera(d.lista)),
  modelosOndaCalor: () =>
    espera<ModelosOndaCalor>({
      fonte: 'Dados demonstrativos',
      versaoLimiar: 'A707-2003-2026-v1',
      maxHistoricoC: MAX_HISTORICO_DEMO,
      modelos: [0, 1, 3].map(modeloDemo),
    }),
  criarSimulacao: (c: CenarioSimulacao) => dadosBase().then(({ setores }) => {
    const id = simulacoesDemo.size + 1
    const nc = niveis(c.icMaxPorDia)
    const capacidade = c.agentesPorUbs * c.contatosPorAgenteDia * 36
    let pendentes = 0
    const dias = c.icMaxPorDia.map((ic, i) => {
      // números fictícios: só para ver a tela funcionando sem a API
      // os pendentes de ontem já fazem parte da lista de hoje (ninguém aparece duas vezes)
      const lista = Math.max(nc[i] >= 3 ? [0, 0, 0, 180, 900, 2600][nc[i]] : 0, pendentes)
      const contatadas = Math.min(lista, capacidade)
      pendentes = lista - contatadas
      const semRefugio = c.refugios === 'NENHUM' ? lista : Math.round(lista * 0.4)
      return {
        dia: i + 1, data: null, icMaxC: ic, nivel: nc[i], nome: NOMES_NC[nc[i]], regra: '—',
        extrapolacao: ic > MAX_HISTORICO_DEMO, pessoasNaLista: lista, contatadas, pendentes, semRefugio800m: semRefugio,
      }
    })
    const detalhe: SimulacaoDetalhe = {
      id, nome: c.nome ?? `Simulação de ${dias.length} dias`, status: 'CONCLUIDA', criadoEm: agora(),
      cenario: {
        modeloId: c.modeloId ?? null, dataInicio: c.dataInicio ?? null, qtdDias: dias.length, refugios: c.refugios,
        agentesPorUbs: c.agentesPorUbs, contatosPorAgenteDia: c.contatosPorAgenteDia, fatorK: c.fatorK, distrito: c.distrito ?? null,
      },
      versaoLimiar: 'A707-2003-2026-v1', maxHistoricoIcC: MAX_HISTORICO_DEMO,
      nivelMaximo: Math.max(...nc) as NivelCalor, diasExtrapolados: dias.filter((d) => d.extrapolacao).length,
      dias, setores: distribuirPorSetor(dias, setores, c),
    }
    simulacoesDemo.set(id, detalhe)
    return espera<SimulacaoResumo>({ id, nome: detalhe.nome, status: 'CONCLUIDA', qtdDias: dias.length, nivelMaximo: detalhe.nivelMaximo, diasExtrapolados: detalhe.diasExtrapolados }, 600)
  }),
  listarSimulacoes: () =>
    espera<SimulacaoResumo[]>(
      [...simulacoesDemo.values()].reverse().map((s) => ({
        id: s.id, nome: s.nome, status: s.status, qtdDias: s.cenario.qtdDias, nivelMaximo: s.nivelMaximo,
        diasExtrapolados: s.diasExtrapolados, modeloId: s.cenario.modeloId, refugios: s.cenario.refugios,
        agentesPorUbs: s.cenario.agentesPorUbs, distrito: s.cenario.distrito, criadoEm: s.criadoEm,
      })),
    ),
  simulacao: (id: number, dia?: number) => {
    const s = simulacoesDemo.get(id)
    if (!s) return Promise.reject(new Error('Simulação não encontrada'))
    return espera({ ...s, setores: dia ? s.setores.filter((x) => x.dia === dia) : s.setores })
  },
  servicosDoSetor: (codigo: string) =>
    dadosBase().then(({ setores, servicos }) => {
      const setor = setores.features.find((f) => f.id === codigo)
      if (!setor) throw new Error('Setor não encontrado')
      // No mock, o ponto de referência é a média dos vértices do primeiro anel (na API vem do IBGE).
      const anel = setor.geometry.coordinates[0][0]
      const lon = anel.reduce((t, c) => t + c[0], 0) / anel.length
      const lat = anel.reduce((t, c) => t + c[1], 0) / anel.length
      return espera<ServicosDoSetor>({
        codigoSetor: codigo,
        ubsMaisProxima: maisProximo(servicos.filter((s) => s.tipo === 'UBS'), lat, lon),
        refugioMaisProximo: maisProximo(servicos.filter((s) => s.tipo === 'REFUGIO' && s.revisao === 'manter'), lat, lon),
      })
    }),
}
