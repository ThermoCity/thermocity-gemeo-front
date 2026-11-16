/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_TERRITORIO_URL?: string
  readonly VITE_USE_MOCKS_TERRITORIO?: string
  readonly VITE_API_JAVA_URL?: string
  readonly VITE_API_CLIMA_URL?: string
  readonly VITE_USE_MOCKS?: string
  readonly VITE_USE_MOCKS_LISTA?: string
  readonly VITE_DEMO_EMAIL?: string
  readonly VITE_DEMO_SENHA?: string
  readonly VITE_SEM_LOGIN?: string
  readonly VITE_API_TIMEOUT_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
