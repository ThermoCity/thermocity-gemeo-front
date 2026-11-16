import { useEffect, useRef, useState } from 'react'
import { NOMES_NC } from '../components/mapa/escalas'

export interface AvisoNivel {
  texto: string
  em: Date
}

const nome = (n: number) => `NC${n} (${NOMES_NC[n] ?? ''})`

/**
 * Gera um aviso quando, entre uma atualização e outra, o nível de calor vigente muda (ex.: NC2 → NC3)
 * ou a lista do dia começa/termina. A primeira leitura de cada um não gera aviso.
 * @param nivel nível vigente; undefined = ainda não carregou
 * @param nivelDaLista nível que gerou a lista do dia; null = sem busca ativa; undefined = ainda não carregou
 */
export function useAvisoNivel(nivel: number | undefined, nivelDaLista: number | null | undefined) {
  const nivelAntes = useRef<number | undefined>(undefined)
  const listaAntes = useRef<number | null | undefined>(undefined)
  const [aviso, setAviso] = useState<AvisoNivel | null>(null)

  useEffect(() => {
    if (nivel === undefined) return
    const antes = nivelAntes.current
    nivelAntes.current = nivel
    if (antes === undefined || antes === nivel) return
    setAviso({ texto: `O nível de calor ${nivel > antes ? 'subiu' : 'baixou'} de ${nome(antes)} para ${nome(nivel)}.`, em: new Date() })
  }, [nivel])

  useEffect(() => {
    if (nivelDaLista === undefined) return
    const antes = listaAntes.current
    listaAntes.current = nivelDaLista
    if (antes === undefined || antes === nivelDaLista) return
    let texto: string
    if (nivelDaLista === null) texto = 'A busca ativa de hoje foi encerrada: não há mais lista do dia.'
    else if (antes === null) texto = `A busca ativa começou: lista do dia gerada com o nível ${nome(nivelDaLista)}.`
    else texto = `A lista do dia foi refeita com o nível ${nome(nivelDaLista)} (antes ${nome(antes)}).`
    setAviso({ texto, em: new Date() })
  }, [nivelDaLista])

  return { aviso, fecharAviso: () => setAviso(null) }
}
