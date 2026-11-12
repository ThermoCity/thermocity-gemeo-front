import { config } from '../config/env'
import type { SituacaoClima } from '../types'
import { requisitar } from './http'

/** Chamadas à API de clima (.NET). */
export const climaApi = {
  situacaoAtual: () => requisitar<SituacaoClima>(config.apiClimaUrl, '/niveis/atual'),
}
