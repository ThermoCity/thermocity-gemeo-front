/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_JAVA_URL?: string
  readonly VITE_API_CLIMA_URL?: string
  readonly VITE_USE_MOCKS?: string
  readonly VITE_DEV_TOKEN?: string
  readonly VITE_API_TIMEOUT_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
