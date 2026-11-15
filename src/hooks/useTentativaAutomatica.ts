import { useEffect, useState } from 'react'

/** Segundos de espera antes de chamar a API de novo depois de uma falha. */
export const TENTAR_DE_NOVO_S = 15

/**
 * Enquanto houver erro, conta até `intervaloS` e chama `recarregar` sozinho.
 * Devolve os segundos que faltam (ou null quando não há erro), para mostrar na tela.
 */
export function useTentativaAutomatica(erro: string | null, recarregar: () => void, intervaloS = TENTAR_DE_NOVO_S): number | null {
  const [restante, setRestante] = useState<number | null>(null)

  useEffect(() => {
    if (!erro) {
      setRestante(null)
      return
    }
    const fim = Date.now() + intervaloS * 1000
    setRestante(intervaloS)
    const timer = setInterval(() => {
      const faltam = Math.ceil((fim - Date.now()) / 1000)
      if (faltam <= 0) {
        clearInterval(timer)
        recarregar()
      } else {
        setRestante(faltam)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [erro, recarregar, intervaloS])

  return restante
}
