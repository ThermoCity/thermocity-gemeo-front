import type { Papel } from '../types'

/** Sessão guardada no navegador: o token da API de cadastro e os dados do usuário logado. */
export interface SessaoSalva {
  token: string
  email: string
  papel: Papel
  expiraEm: string // ISO
}

const CHAVE = 'thermocity-sessao'

/** sessionStorage: a sessão some ao fechar a aba. Se o armazenamento falhar, a sessão fica só na memória. */
export function lerSessao(): SessaoSalva | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE)
    if (!bruto) return null
    const sessao = JSON.parse(bruto) as SessaoSalva
    return new Date(sessao.expiraEm).getTime() > Date.now() ? sessao : null
  } catch {
    return null
  }
}

export function salvarSessao(sessao: SessaoSalva) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(sessao))
  } catch {
    /* sem persistência: vale até recarregar a página */
  }
}

export function apagarSessao() {
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    /* nada a apagar */
  }
}
