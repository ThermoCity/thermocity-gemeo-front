import { useEffect, useState } from 'react'
import { SomenteGestor, useSessao } from './auth/AuthContext'
import { Abas, abaDoEndereco, type Aba } from './components/layout/Abas'
import { FaixaContexto } from './components/layout/FaixaContexto'
import { Sidebar } from './components/layout/Sidebar'
import { config } from './config/env'
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
  const { usuario } = useSessao()
  const [aba, setAba] = useState<Aba>(abaDoEndereco)
  const [tema, setTema] = useState<Tema>(temaInicial)

  const setores = useDados(api.setoresGeoJson)
  const servicos = useDados(api.servicos)
  const clima = useDados(api.situacaoAtual)
  const estado = useDados(api.estado)
  const lista = useDados(api.listaDoDia)

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
      <Sidebar usuario={usuario?.nome ?? ''} />
      <main className="conteudo">
        <FaixaContexto
          atualizadoEm={estado.dados?.atualizadoEm ?? clima.dados?.atualizadoEm ?? null}
          tema={tema}
          onTema={() => setTema((t) => (t === 'claro' ? 'escuro' : 'claro'))}
          usandoMocks={config.usarMocks}
        />
        <Abas aba={aba} onAba={trocarAba} />
        {aba === 'agora' ? (
          <AgoraPage
            setores={setores}
            servicos={servicos}
            clima={clima}
            estado={estado}
            lista={lista}
            seloMapa={config.usarMocks ? 'Dados demonstrativos' : undefined}
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
