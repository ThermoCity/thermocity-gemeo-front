/**
 * Configuração lida das variáveis de ambiente do Vite (arquivo .env, veja .env.example).
 * Nenhum segredo fica no código: o token de desenvolvimento também vem do .env.
 */
const env = import.meta.env

const usarMocks = (env.VITE_USE_MOCKS ?? 'true') !== 'false'
const usarMocksLista = (env.VITE_USE_MOCKS_LISTA ?? env.VITE_USE_MOCKS ?? 'true') !== 'false'

export const config = {
  /** API da base territorial (Java): setores com calor, IPVS e população idosa, UBS e refúgios. */
  apiTerritorioUrl: (env.VITE_API_TERRITORIO_URL ?? 'https://thermocity-base-territorial-api.azurewebsites.net').replace(/\/$/, ''),
  /** true = usa os setores e serviços mockados de public/mocks em vez da base territorial (uso offline). */
  usarMocksTerritorio: (env.VITE_USE_MOCKS_TERRITORIO ?? 'false') === 'true',
  /** API Java de cadastro (Arthur): lista do dia (GET /listas/hoje), contatos e cobertura. Exige o JWT de um gestor. */
  apiJavaUrl: (env.VITE_API_JAVA_URL ?? 'https://thermocity-cadastro-api.azurewebsites.net').replace(/\/$/, ''),
  /** API de clima (.NET): nível de calor atual e previsto. */
  apiClimaUrl: (env.VITE_API_CLIMA_URL ?? 'http://localhost:5000').replace(/\/$/, ''),
  /** true = nível de calor mockado (a API de clima ainda não está publicada). */
  usarMocks,
  /** true = lista do dia mockada. Padrão: segue VITE_USE_MOCKS (false liga a lista real da API de cadastro). */
  usarMocksLista,
  /** Login na API de cadastro (POST /auth/login). VITE_SEM_LOGIN=true pula o login, só para uso offline com mocks. */
  loginObrigatorio: (env.VITE_SEM_LOGIN ?? 'false') !== 'true',
  /** Usuário de teste exibido na tela de login (demonstração). Fica no .env, nunca no código. */
  demoEmail: env.VITE_DEMO_EMAIL ?? '',
  demoSenha: env.VITE_DEMO_SENHA ?? '',
  /** Tempo máximo de cada requisição, em milissegundos. */
  // 90 s por padrão: no Azure, a primeira chamada depois de um tempo parada (ou logo após um deploy)
  // acorda a API, que ainda monta o GeoJSON dos setores; isso pode passar de 30 s.
  timeoutMs: Number(env.VITE_API_TIMEOUT_MS ?? 90000),
} as const
