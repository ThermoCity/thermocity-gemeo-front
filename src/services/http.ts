import { config } from '../config/env'

/** Erro padronizado das APIs ThermoCity ({ status, erro, mensagem, detalhes[] }). */
export class ApiError extends Error {
  readonly status: number
  readonly detalhes: string[]

  constructor(status: number, mensagem: string, detalhes: string[] = []) {
    super(mensagem)
    this.name = 'ApiError'
    this.status = status
    this.detalhes = detalhes
  }
}

let tokenAtual = ''
let aoNaoAutorizado: (() => void) | null = null

/** Define o token JWT (vindo do login) usado nas próximas requisições. */
export function definirToken(token: string) {
  tokenAtual = token
}

/** Avisa quando uma chamada com token volta 401 (token vencido): a sessão é encerrada. Devolve o cancelamento. */
export function aoPerderAcesso(callback: () => void) {
  aoNaoAutorizado = callback
  return () => {
    if (aoNaoAutorizado === callback) aoNaoAutorizado = null
  }
}

/** GET/POST com JWT, tempo limite e tradução dos erros para ApiError. */
export async function requisitar<T>(baseUrl: string, caminho: string, init: RequestInit = {}): Promise<T> {
  const controle = new AbortController()
  const timer = setTimeout(() => controle.abort(), config.timeoutMs)
  const cabecalhos = new Headers(init.headers)
  cabecalhos.set('Accept', 'application/json')
  if (init.body) cabecalhos.set('Content-Type', 'application/json')
  if (tokenAtual) cabecalhos.set('Authorization', `Bearer ${tokenAtual}`)

  try {
    const resposta = await fetch(`${baseUrl}${caminho}`, { ...init, headers: cabecalhos, signal: controle.signal })
    if (resposta.status === 204) return undefined as T
    const corpo = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      if (resposta.status === 401 && tokenAtual) aoNaoAutorizado?.()
      throw new ApiError(resposta.status, corpo?.mensagem ?? `Erro ${resposta.status} ao acessar ${caminho}`, corpo?.detalhes ?? [])
    }
    return corpo as T
  } catch (erro) {
    if (erro instanceof ApiError) throw erro
    if (erro instanceof DOMException && erro.name === 'AbortError') {
      throw new ApiError(504, 'A API demorou demais para responder')
    }
    throw new ApiError(503, 'Não foi possível conectar à API')
  } finally {
    clearTimeout(timer)
  }
}
