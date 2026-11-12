import { useCallback, useEffect, useState } from 'react'

export interface EstadoDados<T> {
  dados: T | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

/** Busca dados de forma assíncrona com estados de carregamento e erro. */
export function useDados<T>(buscar: () => Promise<T>): EstadoDados<T> {
  const [dados, setDados] = useState<T | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    buscar()
      .then((resultado) => {
        if (!ativo) return
        setDados(resultado)
        setErro(null)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro inesperado')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [buscar, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  return { dados, carregando, erro, recarregar }
}
