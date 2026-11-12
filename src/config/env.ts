/**
 * Configuração lida das variáveis de ambiente do Vite (arquivo .env, veja .env.example).
 * Nenhum segredo fica no código: o token de desenvolvimento também vem do .env.
 */
const env = import.meta.env

export const config = {
  /** API Java (base-territorial / gêmeo): setores, lista do dia, contatos, simulações. */
  apiJavaUrl: (env.VITE_API_JAVA_URL ?? 'http://localhost:8080').replace(/\/$/, ''),
  /** API de clima (.NET): nível de calor atual e previsto. */
  apiClimaUrl: (env.VITE_API_CLIMA_URL ?? 'http://localhost:5000').replace(/\/$/, ''),
  /** true = usa os dados mockados de src/mocks (padrão enquanto as APIs não estão prontas). */
  usarMocks: (env.VITE_USE_MOCKS ?? 'true') !== 'false',
  /** Token JWT de desenvolvimento, usado enquanto não há tela de login. */
  tokenDev: env.VITE_DEV_TOKEN ?? '',
  /** Tempo máximo de cada requisição, em milissegundos. */
  timeoutMs: Number(env.VITE_API_TIMEOUT_MS ?? 10000),
} as const
