/**
 * Configuração lida das variáveis de ambiente do Vite (arquivo .env, veja .env.example).
 * Nenhum segredo fica no código: o token de desenvolvimento também vem do .env.
 */
const env = import.meta.env

export const config = {
  /** API da base territorial (Java): setores com calor, IPVS e população idosa, UBS e refúgios. */
  apiTerritorioUrl: (env.VITE_API_TERRITORIO_URL ?? 'https://thermocity-base-territorial-api.azurewebsites.net').replace(/\/$/, ''),
  /** true = usa os setores e serviços mockados de public/mocks em vez da base territorial (uso offline). */
  usarMocksTerritorio: (env.VITE_USE_MOCKS_TERRITORIO ?? 'false') === 'true',
  /** API Java de cadastro (Arthur): lista do dia (GET /listas/hoje), contatos e cobertura. Exige o JWT de um gestor. */
  apiJavaUrl: (env.VITE_API_JAVA_URL ?? 'http://localhost:8080').replace(/\/$/, ''),
  /** API de clima (.NET): nível de calor atual e previsto. */
  apiClimaUrl: (env.VITE_API_CLIMA_URL ?? 'http://localhost:5000').replace(/\/$/, ''),
  /** true = usa os dados mockados para o que ainda não tem API: usuário, nível de calor, estado e lista do dia. */
  usarMocks: (env.VITE_USE_MOCKS ?? 'true') !== 'false',
  /** true = lista do dia mockada. Padrão: segue VITE_USE_MOCKS (false liga a lista real da API de cadastro). */
  usarMocksLista: (env.VITE_USE_MOCKS_LISTA ?? env.VITE_USE_MOCKS ?? 'true') !== 'false',
  /** Token JWT de desenvolvimento, usado enquanto não há tela de login. */
  tokenDev: env.VITE_DEV_TOKEN ?? '',
  /** Tempo máximo de cada requisição, em milissegundos. */
  // 90 s por padrão: no Azure, a primeira chamada depois de um tempo parada (ou logo após um deploy)
  // acorda a API, que ainda monta o GeoJSON dos setores; isso pode passar de 30 s.
  timeoutMs: Number(env.VITE_API_TIMEOUT_MS ?? 90000),
} as const
