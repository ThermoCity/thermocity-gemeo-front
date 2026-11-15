import { useEffect, useState } from 'react'

interface Props {
  carregando: boolean
  erro: string | null
  onTentarDeNovo: () => void
}

/** Segundos até avisar que a API pode estar "acordando" (Azure desliga a API depois de um tempo parada). */
const AVISO_DEMORA_S = 8

/** Ocupa a área do mapa enquanto os setores carregam ou quando a busca falha. */
export function EstadoMapa({ carregando, erro, onTentarDeNovo }: Props) {
  const segundos = useSegundosDesde(carregando)

  if (carregando) {
    return (
      <div className="mapa-estado" role="status" aria-live="polite">
        <span className="mapa-spinner" aria-hidden="true" />
        <strong>Carregando o mapa de Presidente Prudente…</strong>
        <span className="mapa-estado-detalhe">Setores, nota de calor, UBS e refúgios ({segundos} s)</span>
        {segundos >= AVISO_DEMORA_S && (
          <span className="mapa-estado-aviso">
            A API pode estar iniciando depois de um tempo parada. A primeira carga pode levar até um minuto.
          </span>
        )}
      </div>
    )
  }

  if (erro) {
    return (
      <div className="mapa-estado" role="alert">
        <strong className="estado-erro">Não foi possível carregar o mapa</strong>
        <span className="mapa-estado-detalhe">{erro}</span>
        <button type="button" className="botao-primario" onClick={onTentarDeNovo}>
          Tentar de novo
        </button>
      </div>
    )
  }

  return null
}

/** Conta os segundos desde que `ativo` virou true (zera quando volta a carregar). */
function useSegundosDesde(ativo: boolean): number {
  const [segundos, setSegundos] = useState(0)
  useEffect(() => {
    if (!ativo) return
    const inicio = Date.now()
    setSegundos(0)
    const timer = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [ativo])
  return segundos
}
