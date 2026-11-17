import { config } from '../config/env'
import type { NivelCalor, NivelDia, SituacaoClima } from '../types'
import { ApiError, requisitar } from './http'

/** Um dia de GET /api/heat-alerts: sem leitura ou previsão, nível, nome e IC vêm nulos. */
interface DiaAlertaApi {
  data: string
  nivel: number | null
  nome: string | null
  icMaxC: number | null
  origem: 'OBSERVADO' | 'PREVISTO'
}

/** Resposta de GET /api/heat-alerts da API de clima (.NET, Lucas). */
interface AlertasCalorApi {
  hoje: DiaAlertaApi | null
  proximosDias: DiaAlertaApi[]
  criterio: string
  acaoEsperada: string
  versaoLimiar: string
  atualizadoEm: string
  desatualizado: boolean
}

const paraNivelDia = (d: DiaAlertaApi | null): NivelDia | null =>
  d && d.nivel != null && d.icMaxC != null
    ? { data: d.data, nivel: d.nivel as NivelCalor, nome: d.nome ?? '', icMaxC: d.icMaxC, origem: d.origem }
    : null

/** Chamadas à API de clima (.NET): nível de calor de hoje (observado) e dos próximos dias (previsto). */
export const climaApi = {
  situacaoAtual: async (): Promise<SituacaoClima> => {
    const r = await requisitar<AlertasCalorApi>(config.apiClimaUrl, '/api/heat-alerts')
    const hoje = paraNivelDia(r.hoje)
    // Sem leitura de hoje não há nível: o painel mostra o nível da lista do dia, se houver
    if (!hoje) throw new ApiError(503, 'A API de clima ainda não tem leitura de hoje')
    return {
      hoje,
      proximosDias: r.proximosDias.map(paraNivelDia).filter((d): d is NivelDia => d != null),
      criterio: r.criterio,
      acaoEsperada: r.acaoEsperada,
      atualizadoEm: r.atualizadoEm,
      desatualizado: r.desatualizado,
    }
  },
}
