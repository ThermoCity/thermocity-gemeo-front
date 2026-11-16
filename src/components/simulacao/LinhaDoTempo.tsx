import type { DiaSimulado } from '../../types'
import { CORES_NC, TEXTO_NC } from '../mapa/escalas'
import { formatar } from './cenario'

interface Props {
  dias: DiaSimulado[]
  diaSelecionado: number
  onDia: (dia: number) => void
}

const n = (v: number | null) => (v ?? 0).toLocaleString('pt-BR')

/**
 * Linha do tempo da simulação: em cada dia, o nível NC e uma barra com o tamanho da lista
 * (parte escura = contatadas, parte laranja = pendentes). Clicar num dia muda o dia do mapa.
 */
export function LinhaDoTempo({ dias, diaSelecionado, onDia }: Props) {
  const maior = Math.max(1, ...dias.map((d) => d.pessoasNaLista ?? 0))
  return (
    <div className="linha-tempo" role="group" aria-label="Linha do tempo da simulação">
      {dias.map((d) => {
        const lista = d.pessoasNaLista ?? 0
        const altura = (100 * lista) / maior
        const contatadas = lista ? (100 * (d.contatadas ?? 0)) / lista : 0
        return (
          <button
            key={d.dia}
            type="button"
            className={`linha-tempo-dia${d.dia === diaSelecionado ? ' ativo' : ''}`}
            aria-pressed={d.dia === diaSelecionado}
            aria-label={`Dia ${d.dia}: NC${d.nivel} ${d.nome}, ${n(lista)} na lista, ${n(d.contatadas)} contatadas, ${n(d.pendentes)} pendentes`}
            onClick={() => onDia(d.dia)}
          >
            <span className="linha-tempo-nc" style={{ background: CORES_NC[d.nivel], color: TEXTO_NC[d.nivel] }}>
              NC{d.nivel}
            </span>
            <span className="linha-tempo-ic">
              {formatar(d.icMaxC)} °C{d.extrapolacao ? ' *' : ''}
            </span>
            <span className="linha-tempo-barra" aria-hidden="true">
              <span className="linha-tempo-lista" style={{ height: `${altura}%` }}>
                <span className="linha-tempo-pendentes" style={{ height: `${100 - contatadas}%` }} />
              </span>
            </span>
            <span className="linha-tempo-num">{n(lista)}</span>
            <span className="linha-tempo-sub">
              {n(d.contatadas)} ✓ · {n(d.pendentes)} pend.
            </span>
            <span className="linha-tempo-rotulo">Dia {d.dia}</span>
          </button>
        )
      })}
    </div>
  )
}
