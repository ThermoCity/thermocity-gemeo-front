import { useCallback, useEffect, useRef, useState } from 'react'

export interface EstadoDados<T> {
  dados: T | null
  /** true só na primeira carga (ou ao tentar de novo depois de um erro sem dados): a atualização periódica é silenciosa. */
  carregando: boolean
  /** Erro quando não há dados para mostrar. Se a atualização periódica falhar, os dados ficam e `desatualizado` liga. */
  erro: string | null
  recarregar: () => void
  /** Hora da última busca que deu certo. */
  atualizadoEm: Date | null
  /** A última atualização periódica falhou: os dados mostrados são os da última busca que deu certo. */
  desatualizado: boolean
}

interface Opcoes {
  /** Busca de novo a cada N ms, sem piscar a tela (PBI 111). Sem valor: busca só uma vez. */
  intervaloMs?: number
}

/** Busca dados de forma assíncrona, com estados de carregamento e erro e, opcionalmente, atualização periódica. */
export function useDados<T>(buscar: () => Promise<T>, { intervaloMs }: Opcoes = {}): EstadoDados<T> {
  const [dados, setDados] = useState<T | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)
  const [desatualizado, setDesatualizado] = useState(false)
  const [versao, setVersao] = useState(0)
  const temDados = useRef(false)

  useEffect(() => {
    let ativo = true

    const executar = (silenciosa: boolean) => {
      if (!silenciosa || !temDados.current) {
        setCarregando(true)
        setErro(null)
      }
      buscar()
        .then((resultado) => {
          if (!ativo) return
          temDados.current = true
          setDados(resultado)
          setErro(null)
          setDesatualizado(false)
          setAtualizadoEm(new Date())
        })
        .catch((e: unknown) => {
          if (!ativo) return
          // Já há dados na tela: mantém e marca como desatualizado; a próxima rodada tenta de novo
          if (temDados.current) setDesatualizado(true)
          else setErro(e instanceof Error ? e.message : 'Erro inesperado')
        })
        .finally(() => {
          if (ativo) setCarregando(false)
        })
    }

    executar(false)
    if (!intervaloMs) {
      return () => {
        ativo = false
      }
    }

    // Aba escondida não consulta as APIs; ao voltar para a aba, atualiza na hora
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') executar(true)
    }, intervaloMs)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') executar(true)
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      ativo = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [buscar, versao, intervaloMs])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  return { dados, carregando, erro, recarregar, atualizadoEm, desatualizado }
}
