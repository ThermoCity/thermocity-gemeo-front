import { config } from '../config/env'
import { climaApi } from './climaApi'
import { javaApi } from './javaApi'
import { mockApi } from './mockApi'

/**
 * Ponto único de acesso aos dados do painel.
 * Com VITE_USE_MOCKS=true (padrão) usa os mocks; com false chama as APIs Java e .NET.
 */
export const api = config.usarMocks
  ? mockApi
  : {
      usuarioAtual: javaApi.usuarioAtual,
      setoresGeoJson: javaApi.setoresGeoJson,
      servicos: javaApi.servicos,
      estado: javaApi.estado,
      listaDoDia: javaApi.listaDoDia,
      situacaoAtual: climaApi.situacaoAtual,
    }

export { ApiError, definirToken } from './http'
