import { useTentativaAutomatica } from '../../hooks/useTentativaAutomatica'

interface Props {
  erro: string | null
  carregando: boolean
  onTentarDeNovo: () => void
}

/** Faixa sobre o mapa quando UBS e refúgios não carregam (os setores continuam aparecendo). */
export function AvisoServicos({ erro, carregando, onTentarDeNovo }: Props) {
  const restante = useTentativaAutomatica(carregando ? null : erro, onTentarDeNovo)
  if (!erro || carregando) return null
  return (
    <div className="aviso-camada" role="alert">
      <span>
        UBS e refúgios não carregaram ({erro}).{restante != null && ` Tentando de novo em ${restante} s.`}
      </span>
      <button type="button" className="botao-link" onClick={onTentarDeNovo}>
        Tentar agora
      </button>
    </div>
  )
}
