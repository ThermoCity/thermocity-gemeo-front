import { config } from '../config/env'
import { climaApi } from './climaApi'
import { javaApi } from './javaApi'
import { mockApi } from './mockApi'
import { territorioApi } from './territorioApi'

/**
 * Ponto único de acesso aos dados do painel.
 * - Setores, serviços e simulações: base territorial no Azure (VITE_USE_MOCKS_TERRITORIO=true volta aos mocks, para uso offline).
 * - Lista do dia: API de cadastro (Java) com VITE_USE_MOCKS_LISTA=false; mock por padrão.
 * - Usuário, nível de calor e estado: mocks enquanto VITE_USE_MOCKS=true (APIs ainda não publicadas).
 */
const territorio = config.usarMocksTerritorio
  ? {
      setoresGeoJson: mockApi.setoresGeoJson,
      servicos: mockApi.servicos,
      servicosDoSetor: mockApi.servicosDoSetor,
      modelosOndaCalor: mockApi.modelosOndaCalor,
      criarSimulacao: mockApi.criarSimulacao,
      simulacao: mockApi.simulacao,
    }
  : territorioApi

const restante = config.usarMocks
  ? {
      usuarioAtual: mockApi.usuarioAtual,
      estado: mockApi.estado,
      situacaoAtual: mockApi.situacaoAtual,
    }
  : {
      usuarioAtual: javaApi.usuarioAtual,
      estado: javaApi.estado,
      situacaoAtual: climaApi.situacaoAtual,
    }

/** Lista do dia: API de cadastro (GET /listas/hoje) assim que VITE_USE_MOCKS_LISTA=false. */
const lista = { listaDoDia: config.usarMocksLista ? mockApi.listaDoDia : javaApi.listaDoDia }

export const api = { ...territorio, ...restante, ...lista }

export { ApiError, definirToken } from './http'
