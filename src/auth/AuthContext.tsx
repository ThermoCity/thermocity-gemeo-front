import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { config } from '../config/env'
import { definirToken, aoPerderAcesso } from '../services/http'
import { autenticar } from '../services/authApi'
import { LoginPage } from '../pages/LoginPage'
import type { Usuario } from '../types'
import { apagarSessao, lerSessao, salvarSessao } from './sessao'

interface Sessao {
  usuario: Usuario | null
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => void
}

/** Usuário fixo com VITE_SEM_LOGIN=true (uso offline): não há API para autenticar. */
const USUARIO_MOCK: Usuario = { nome: 'Gestor demonstração', email: 'gestor@thermocity.demo', papel: 'GESTOR' }

const SessaoContext = createContext<Sessao>({ usuario: null, entrar: async () => {}, sair: () => {} })

function usuarioDaSessao(email: string, papel: Usuario['papel']): Usuario {
  return { nome: email, email, papel }
}

/**
 * Sessão do gestor. O login é feito na API de cadastro (POST /auth/login), que devolve o JWT usado nas
 * chamadas protegidas (lista do dia, cobertura). Com VITE_SEM_LOGIN=true, entra direto com o usuário mock.
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    if (!config.loginObrigatorio) return USUARIO_MOCK
    const salva = lerSessao()
    if (!salva) return null
    definirToken(salva.token)
    return usuarioDaSessao(salva.email, salva.papel)
  })

  const sair = useCallback(() => {
    apagarSessao()
    definirToken('')
    setUsuario(config.loginObrigatorio ? null : USUARIO_MOCK)
  }, [])

  // Token vencido ou recusado (401) em qualquer chamada: volta para a tela de login
  useEffect(() => aoPerderAcesso(sair), [sair])

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await autenticar(email, senha)
    const emailNormalizado = email.trim().toLowerCase()
    salvarSessao({ token: resposta.token, email: emailNormalizado, papel: resposta.papel, expiraEm: resposta.expiraEm })
    definirToken(resposta.token)
    setUsuario(usuarioDaSessao(emailNormalizado, resposta.papel))
  }, [])

  return <SessaoContext.Provider value={{ usuario, entrar, sair }}>{children}</SessaoContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export const useSessao = () => useContext(SessaoContext)

/** O painel é exclusivo do papel GESTOR. Sem sessão, mostra a tela de login. */
export function SomenteGestor({ children }: { children: ReactNode }) {
  const { usuario, sair } = useSessao()
  if (!usuario) return <LoginPage />
  if (usuario.papel !== 'GESTOR') {
    return (
      <div className="tela-estado">
        <div>
          <p>O painel do gêmeo digital é exclusivo para gestores de saúde.</p>
          <button type="button" className="botao-link" onClick={sair}>
            Entrar com outro usuário
          </button>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
