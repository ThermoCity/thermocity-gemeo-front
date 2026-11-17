import type { SetorFeature, SetorProps, SimulacaoDetalhe } from '../../types'
import { CORES_NC, SEM_DADO, type DefinicaoCamada } from '../mapa/escalas'

/** Os dois indicadores comparados: idosos da lista sem refúgio a até 800 m e pessoas sem contato (pendentes). */
export interface Par {
  a: number
  b: number
}
const par = (a: number, b: number): Par => ({ a, b })
export const diferenca = (p: Par) => p.b - p.a

export interface LinhaDia {
  dia: number
  nivelA: number
  nivelB: number
  semRefugio: Par
  semContato: Par
}

export interface LinhaRegiao {
  regiao: string
  semRefugio: Par
  semContato: Par
}

export interface LinhaSetor extends LinhaRegiao {
  codigo: string
}

/**
 * Só compara cenários com o mesmo número de dias (Cenário 2 do PBI 115). Devolve a mensagem para o gestor,
 * ou null quando a comparação pode ser feita.
 */
export function motivoIncomparavel(a: SimulacaoDetalhe, b: SimulacaoDetalhe): string | null {
  if (a.id === b.id) return 'Escolha duas simulações diferentes para comparar.'
  if (a.status !== 'CONCLUIDA' || b.status !== 'CONCLUIDA') return 'Só é possível comparar simulações concluídas.'
  if (a.cenario.qtdDias !== b.cenario.qtdDias) {
    return `Só é possível comparar cenários com o mesmo número de dias: A tem ${a.cenario.qtdDias} e B tem ${b.cenario.qtdDias}.`
  }
  return null
}

/** Avisos que não impedem a comparação, mas mudam a leitura (ex.: ondas de calor diferentes). */
export function avisosComparacao(a: SimulacaoDetalhe, b: SimulacaoDetalhe): string[] {
  const avisos: string[] = []
  const mesmaOnda = a.dias.every((d, i) => d.icMaxC === b.dias[i]?.icMaxC)
  if (!mesmaOnda) avisos.push('As ondas de calor são diferentes: a diferença mistura o efeito do clima com o dos recursos.')
  if ((a.cenario.distrito ?? '') !== (b.cenario.distrito ?? '')) {
    avisos.push('Os recortes são diferentes (cidade toda × distrito): os totais cobrem áreas diferentes.')
  }
  return avisos
}

/** Diferença por dia, com os totais da cidade (ou do recorte) de cada cenário. */
export function compararPorDia(a: SimulacaoDetalhe, b: SimulacaoDetalhe): LinhaDia[] {
  return a.dias.map((da, i) => {
    const db = b.dias[i]
    return {
      dia: da.dia,
      nivelA: da.nivel,
      nivelB: db.nivel,
      semRefugio: par(da.semRefugio800m ?? 0, db.semRefugio800m ?? 0),
      semContato: par(da.pendentes ?? 0, db.pendentes ?? 0),
    }
  })
}

type Somas = Map<string, { semRefugio: Par; semContato: Par }>

/** Soma os dois indicadores de um dia por chave (setor ou distrito). */
function somarNoDia(a: SimulacaoDetalhe, b: SimulacaoDetalhe, dia: number, chave: (codigoSetor: string) => string): Somas {
  const somas: Somas = new Map()
  const acumular = (s: SimulacaoDetalhe, lado: 'a' | 'b') =>
    s.setores
      .filter((x) => x.dia === dia)
      .forEach((x) => {
        const k = chave(x.codigoSetor)
        const atual = somas.get(k) ?? { semRefugio: par(0, 0), semContato: par(0, 0) }
        atual.semRefugio[lado] += x.semRefugio800m
        atual.semContato[lado] += x.pendentes
        somas.set(k, atual)
      })
  acumular(a, 'a')
  acumular(b, 'b')
  return somas
}

/** Diferença por região (distrito) no dia escolhido, das que mais pioram em B para as que mais melhoram. */
export function compararPorRegiao(a: SimulacaoDetalhe, b: SimulacaoDetalhe, dia: number, setores: SetorFeature[]): LinhaRegiao[] {
  const distrito = new Map(setores.map((f) => [f.properties.codigo, f.properties.distrito || 'Sem distrito']))
  const somas = somarNoDia(a, b, dia, (codigo) => distrito.get(codigo) ?? 'Sem distrito')
  return [...somas]
    .map(([regiao, v]) => ({ regiao, ...v }))
    .sort((x, y) => diferenca(y.semRefugio) + diferenca(y.semContato) - (diferenca(x.semRefugio) + diferenca(x.semContato)))
}

/** Setores do dia com alguma diferença entre A e B, dos que mais pioram em B para os que mais melhoram. */
export function compararPorSetor(a: SimulacaoDetalhe, b: SimulacaoDetalhe, dia: number, setores: SetorFeature[]): LinhaSetor[] {
  const distrito = new Map(setores.map((f) => [f.properties.codigo, f.properties.distrito || 'Sem distrito']))
  return [...somarNoDia(a, b, dia, (codigo) => codigo)]
    .map(([codigo, v]) => ({ codigo, regiao: distrito.get(codigo) ?? 'Sem distrito', ...v }))
    .filter((l) => diferenca(l.semRefugio) !== 0 || diferenca(l.semContato) !== 0)
    .sort((x, y) => diferenca(y.semRefugio) + diferenca(y.semContato) - (diferenca(x.semRefugio) + diferenca(x.semContato)))
}

/** Escala divergente: azul = B tem menos pessoas (melhor), laranja = B tem mais (pior). */
const MELHOR = ['#7F98A3', '#B3C3CA']
const IGUAL = '#EEF0F1'

function camadaDiferenca(titulo: string, porSetor: Map<string, number>): DefinicaoCamada {
  return {
    titulo,
    legenda: [
      { cor: MELHOR[0], rotulo: 'B: 6 ou mais a menos' },
      { cor: MELHOR[1], rotulo: 'B: 1 a 5 a menos' },
      { cor: IGUAL, rotulo: 'igual' },
      { cor: CORES_NC[2], rotulo: 'B: 1 a 5 a mais' },
      { cor: CORES_NC[4], rotulo: 'B: 6 ou mais a mais' },
      { cor: SEM_DADO, rotulo: 'Fora dos dois cenários' },
    ],
    cor: (p: SetorProps) => {
      const d = porSetor.get(p.codigo)
      if (d === undefined) return SEM_DADO
      if (d <= -6) return MELHOR[0]
      if (d < 0) return MELHOR[1]
      if (d === 0) return IGUAL
      return d <= 5 ? CORES_NC[2] : CORES_NC[4]
    },
  }
}

/** Camadas do mapa com a diferença B − A por setor no dia escolhido. */
export function camadasComparacao(a: SimulacaoDetalhe, b: SimulacaoDetalhe, dia: number): Record<string, DefinicaoCamada> {
  const somas = somarNoDia(a, b, dia, (codigo) => codigo)
  const de = (campo: 'semRefugio' | 'semContato') => new Map([...somas].map(([k, v]) => [k, diferenca(v[campo])]))
  return {
    difSemRefugio: camadaDiferenca(`A × B, dia ${dia}: idosos sem refúgio a até 800 m (B − A)`, de('semRefugio')),
    difSemContato: camadaDiferenca(`A × B, dia ${dia}: pessoas sem contato (B − A)`, de('semContato')),
  }
}

/** "+12", "−3" ou "0", com o sinal de menos tipográfico. */
export const comSinal = (n: number) => (n > 0 ? `+${n.toLocaleString('pt-BR')}` : n < 0 ? `−${Math.abs(n).toLocaleString('pt-BR')}` : '0')
