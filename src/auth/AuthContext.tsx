import { createContext, useContext, type ReactNode } from 'react'
import { api } from '../services'
import { useDados } from '../hooks/useDados'
import type { Usuario } from '../types'

interface Sessao {
  usuario: Usuario | null
  carregando: boolean
  erro: string | null
}

const SessaoContext = createContext<Sessao>({ usuario: null, carregando: true, erro: null })

/**
 * Sessão do gestor. Ainda não há tela de login: o usuário vem do mock
 * (ou, com as APIs ligadas, do token de desenvolvimento em VITE_DEV_TOKEN).
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const { dados, carregando, erro } = useDados(api.usuarioAtual)
  return <SessaoContext.Provider value={{ usuario: dados, carregando, erro }}>{children}</SessaoContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export const useSessao = () => useContext(SessaoContext)

/** O painel é exclusivo do papel GESTOR. */
export function SomenteGestor({ children }: { children: ReactNode }) {
  const { usuario, carregando, erro } = useSessao()
  if (carregando) return <div className="tela-estado">Carregando sessão…</div>
  if (erro || !usuario) return <div className="tela-estado">Não foi possível identificar o usuário. {erro}</div>
  if (usuario.papel !== 'GESTOR') {
    return <div className="tela-estado">O painel do gêmeo digital é exclusivo para gestores de saúde.</div>
  }
  return <>{children}</>
}
