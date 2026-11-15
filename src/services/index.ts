import { config } from '../config/env'
import { climaApi } from './climaApi'
import { javaApi } from './javaApi'
import { mockApi } from './mockApi'
import { territorioApi } from './territorioApi'

/**
 * Ponto único de acesso aos dados do painel.
 * - Setores e serviços: base territorial no Azure (VITE_USE_MOCKS_TERRITORIO=true volta aos mocks, para uso offline).
 * - Usuário, nível de calor, estado e lista do dia: mocks enquanto VITE_USE_MOCKS=true (APIs ainda não publicadas).
 */
const territorio = config.usarMocksTerritorio
  ? { setoresGeoJson: mockApi.setoresGeoJson, servicos: mockApi.servicos }
  : territorioApi

const restante = config.usarMocks
  ? {
      usuarioAtual: mockApi.usuarioAtual,
      estado: mockApi.estado,
      listaDoDia: mockApi.listaDoDia,
      situacaoAtual: mockApi.situacaoAtual,
    }
  : {
      usuarioAtual: javaApi.usuarioAtual,
      estado: javaApi.estado,
      listaDoDia: javaApi.listaDoDia,
      situacaoAtual: climaApi.situacaoAtual,
    }

export const api = { ...territorio, ...restante }

export { ApiError, definirToken } from './http'
