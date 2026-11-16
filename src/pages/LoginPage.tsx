import { useState, type FormEvent } from 'react'
import icone from '../assets/thermocity-icone.png'
import { useSessao } from '../auth/AuthContext'
import { config } from '../config/env'
import { ApiError } from '../services/http'

/** Tela de login do gestor, com o usuário de teste da demonstração visível. */
export function LoginPage() {
  const { entrar } = useSessao()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const temUsuarioTeste = Boolean(config.demoEmail && config.demoSenha)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await entrar(email, senha)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setErro('E-mail ou senha inválidos.')
      else if (e instanceof ApiError && e.status === 400) setErro('Informe um e-mail válido e a senha.')
      else setErro(e instanceof Error ? e.message : 'Não foi possível entrar.')
    } finally {
      setEnviando(false)
    }
  }

  const usarUsuarioTeste = () => {
    setEmail(config.demoEmail)
    setSenha(config.demoSenha)
    setErro(null)
  }

  return (
    <div className="login">
      <div className="login-cartao">
        <div className="login-marca">
          <img src={icone} alt="" className="marca-icone" />
          <span className="marca-nome">
            <b>THERMO</b>
            <span>city</span>
          </span>
        </div>
        <h1>Painel do gêmeo digital</h1>
        <p className="login-subtitulo">Acesso para gestores de saúde de Presidente Prudente.</p>

        <form onSubmit={enviar} className="login-form">
          <fieldset disabled={enviando}>
            <label>
              E-mail
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Senha
              <input
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </label>
            {erro && (
              <p className="login-erro" role="alert">
                {erro}
              </p>
            )}
            <button type="submit" className="botao-primario">
              {enviando ? 'Entrando… (a API pode demorar na primeira chamada)' : 'Entrar'}
            </button>
          </fieldset>
        </form>

        {temUsuarioTeste && (
          <div className="login-teste">
            <strong>Usuário de teste (gestor)</strong>
            <span>
              E-mail: <code>{config.demoEmail}</code>
            </span>
            <span>
              Senha: <code>{config.demoSenha}</code>
            </span>
            <button type="button" className="botao-link" onClick={usarUsuarioTeste}>
              Preencher com o usuário de teste
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
