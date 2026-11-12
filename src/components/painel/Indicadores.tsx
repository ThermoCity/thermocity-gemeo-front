import type { EstadoGemeo, SituacaoClima } from '../../types'
import { CORES_NC, TEXTO_NC } from '../mapa/escalas'

interface Props {
  clima: SituacaoClima | null
  estado: EstadoGemeo | null
}

export function SeloNivel({ nivel, nome }: { nivel: number; nome?: string }) {
  return (
    <span className="selo-nc" style={{ background: CORES_NC[nivel], color: TEXTO_NC[nivel] }}>
      NC{nivel}
      {nome && <small>{nome}</small>}
    </span>
  )
}

/** Faixa de indicadores do “agora”. Nível de calor, lista e território são informações distintas. */
export function Indicadores({ clima, estado }: Props) {
  const cobertura = estado && estado.pessoasNaLista ? Math.round((100 * estado.contatadas) / estado.pessoasNaLista) : null
  return (
    <section className="indicadores" aria-label="Indicadores do dia">
      <div className="indicador">
        <span className="indicador-rotulo">Nível de calor hoje</span>
        {clima ? <SeloNivel nivel={clima.hoje.nivel} nome={clima.hoje.nome} /> : <span className="indicador-valor">—</span>}
        {clima && <span className="indicador-nota">IC máx. {clima.hoje.icMaxC.toFixed(1).replace('.', ',')} °C ({clima.hoje.origem === 'PREVISTO' ? 'previsto' : 'observado'})</span>}
      </div>
      <div className="indicador">
        <span className="indicador-rotulo">Pessoas na lista do dia</span>
        <span className="indicador-valor">{estado?.pessoasNaLista ?? '—'}</span>
        {estado && <span className="indicador-nota">{estado.precisaAjuda} precisam de ajuda</span>}
      </div>
      <div className="indicador">
        <span className="indicador-rotulo">Cobertura de contatos</span>
        <span className="indicador-valor">{cobertura != null ? `${cobertura}%` : '—'}</span>
        {estado && <span className="indicador-nota">{estado.contatadas} contatadas</span>}
      </div>
      <div className="indicador">
        <span className="indicador-rotulo">Setores com nota de calor 5</span>
        <span className="indicador-valor">{estado?.setoresNota5 ?? '—'}</span>
        <span className="indicador-nota">de 420 setores</span>
      </div>
    </section>
  )
}
