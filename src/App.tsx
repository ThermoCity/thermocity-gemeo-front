import { useEffect, useState } from 'react'
import { SomenteGestor, useSessao } from './auth/AuthContext'
import { Abas, abaDoEndereco, type Aba } from './components/layout/Abas'
import { FaixaContexto } from './components/layout/FaixaContexto'
import { Sidebar } from './components/layout/Sidebar'
import { config } from './config/env'
import { useAvisoNivel } from './hooks/useAvisoNivel'
import { useDados } from './hooks/useDados'
import { AgoraPage } from './pages/AgoraPage'
import { SimulacaoPage } from './pages/SimulacaoPage'
import { api } from './services'

type Tema = 'claro' | 'escuro'

function temaInicial(): Tema {
  try {
    const salvo = localStorage.getItem('thermocity-tema')
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch {
    /* armazenamento indisponível: segue o sistema */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

function Painel() {
  const { usuario, sair } = useSessao()
  const [aba, setAba] = useState<Aba>(abaDoEndereco)
  const [tema, setTema] = useState<Tema>(temaInicial)

  const setores = useDados(api.setoresGeoJson)
  const servicos = useDados(api.servicos)
  // Nível, lista e cobertura se atualizam sozinhos (PBI 111); setores e serviços mudam pouco e carregam uma vez
  const atualizacao = { intervaloMs: config.atualizacaoMs }
  const clima = useDados(api.situacaoAtual, atualizacao)
  const cobertura = useDados(api.cobertura, atualizacao)
  const lista = useDados(api.listaDoDia, atualizacao)

  // Aviso visível quando o nível de calor muda ou a lista do dia começa/termina entre duas atualizações
  const { aviso, fecharAviso } = useAvisoNivel(
    clima.dados?.hoje.nivel,
    cobertura.atualizadoEm ? (cobertura.dados?.nivelCalor ?? null) : undefined,
  )
  const desatualizado = clima.desatualizado || cobertura.desatualizado || lista.desatualizado
  const ultimas = [clima.atualizadoEm, cobertura.atualizadoEm, lista.atualizadoEm].filter((d): d is Date => d != null)
  const atualizadoEm = ultimas.length ? new Date(Math.min(...ultimas.map((d) => d.getTime()))).toISOString() : null

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    try {
      localStorage.setItem('thermocity-tema', tema)
    } catch {
      /* sem persistência */
    }
  }, [tema])

  useEffect(() => {
    const aoMudarEndereco = () => setAba(abaDoEndereco())
    window.addEventListener('hashchange', aoMudarEndereco)
    return () => window.removeEventListener('hashchange', aoMudarEndereco)
  }, [])

  const trocarAba = (nova: Aba) => {
    window.location.hash = `/${nova}`
    setAba(nova)
  }

  return (
    <div className="app">
      <Sidebar usuario={usuario?.nome ?? ''} onSair={sair} />
      <main className="conteudo">
        <FaixaContexto
          atualizadoEm={atualizadoEm}
          desatualizado={desatualizado}
          tema={tema}
          onTema={() => setTema((t) => (t === 'claro' ? 'escuro' : 'claro'))}
          usandoMocks={config.usarMocks}
        />
        {aviso && (
          <div className="aviso-mudanca" role="alert">
            <span>
              <strong>{aviso.em.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong> · {aviso.texto}
            </span>
            <button type="button" className="botao-icone" onClick={fecharAviso} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        )}
        <Abas aba={aba} onAba={trocarAba} />
        {aba === 'agora' ? (
          <AgoraPage
            setores={setores}
            servicos={servicos}
            clima={clima}
            cobertura={cobertura}
            lista={lista}
            seloMapa={config.usarMocksTerritorio ? 'Dados demonstrativos' : undefined}
          />
        ) : (
          <SimulacaoPage setores={setores} servicos={servicos} />
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <SomenteGestor>
      <Painel />
    </SomenteGestor>
  )
}
