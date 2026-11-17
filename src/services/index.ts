import { config } from '../config/env'
import { climaApi } from './climaApi'
import { javaApi } from './javaApi'
import { mockApi } from './mockApi'
import { territorioApi } from './territorioApi'

/**
 * Ponto único de acesso aos dados do painel.
 * - Setores, serviços e simulações: base territorial no Azure (VITE_USE_MOCKS_TERRITORIO=true volta aos mocks, para uso offline).
 * - Lista do dia e cobertura: API de cadastro (Java) com VITE_USE_MOCKS_LISTA=false; mock por padrão.
 * - Login: API de cadastro (POST /auth/login), em auth/AuthContext.
 * - Nível de calor: mock enquanto VITE_USE_MOCKS=true (APIs ainda não publicadas).
 */
const territorio = config.usarMocksTerritorio
  ? {
      setoresGeoJson: mockApi.setoresGeoJson,
      servicos: mockApi.servicos,
      servicosDoSetor: mockApi.servicosDoSetor,
      modelosOndaCalor: mockApi.modelosOndaCalor,
      criarSimulacao: mockApi.criarSimulacao,
      simulacao: mockApi.simulacao,
      listarSimulacoes: mockApi.listarSimulacoes,
    }
  : territorioApi

const restante = { situacaoAtual: config.usarMocks ? mockApi.situacaoAtual : climaApi.situacaoAtual }

/** Lista do dia e cobertura: API de cadastro (GET /listas/hoje e /cobertura/hoje) com VITE_USE_MOCKS_LISTA=false. */
const lista = config.usarMocksLista
  ? { listaDoDia: mockApi.listaDoDia, cobertura: mockApi.cobertura }
  : { listaDoDia: javaApi.listaDoDia, cobertura: javaApi.cobertura }

export const api = { ...territorio, ...restante, ...lista }

export { ApiError } from './http'
