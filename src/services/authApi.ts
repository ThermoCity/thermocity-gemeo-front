import { config } from '../config/env'
import type { Papel } from '../types'
import { requisitar } from './http'

/** Resposta de POST /auth/login da API de cadastro. */
export interface LoginResposta {
  token: string
  tipo: string
  papel: Papel
  expiraEm: string
}

/** Login na API de cadastro (Java). E-mail ou senha errados: ApiError 401. */
export function autenticar(email: string, senha: string) {
  return requisitar<LoginResposta>(config.apiJavaUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), senha }),
  })
}
