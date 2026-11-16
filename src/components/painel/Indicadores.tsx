import type { Cobertura, SituacaoClima } from '../../types'
import { CORES_NC, NOMES_NC, TEXTO_NC } from '../mapa/escalas'
import { porcentagem } from './coberturaMapa'

interface Props {
  clima: SituacaoClima | null
  cobertura: Cobertura | null
  /** true quando a cobertura já foi buscada (null = sem busca ativa hoje). */
  coberturaCarregada: boolean
  setoresNota5: number | null
  totalSetores: number | null
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
export function Indicadores({ clima, cobertura, coberturaCarregada, setoresNota5, totalSetores }: Props) {
  const semBuscaAtiva = coberturaCarregada && !cobertura
  const resumo = cobertura?.resumo
  // Sem a API de clima, o nível de hoje vem da própria lista do dia (maior nível entre as UBS)
  const nivelDaLista = !clima && cobertura ? cobertura.nivelCalor : null

  return (
    <section className="indicadores" aria-label="Indicadores do dia">
      <div className="indicador">
        <span className="indicador-rotulo">Nível de calor hoje</span>
        {clima ? (
          <SeloNivel nivel={clima.hoje.nivel} nome={clima.hoje.nome} />
        ) : nivelDaLista ? (
          <SeloNivel nivel={nivelDaLista} nome={NOMES_NC[nivelDaLista]} />
        ) : (
          <span className="indicador-valor">—</span>
        )}
        {clima && (
          <span className="indicador-nota">
            IC máx. {clima.hoje.icMaxC.toFixed(1).replace('.', ',')} °C ({clima.hoje.origem === 'PREVISTO' ? 'previsto' : 'observado'})
          </span>
        )}
        {nivelDaLista && <span className="indicador-nota">nível que gerou a lista do dia</span>}
      </div>
      <div className="indicador">
        <span className="indicador-rotulo">Pessoas na lista do dia</span>
        <span className="indicador-valor">{resumo ? resumo.total : semBuscaAtiva ? 0 : '—'}</span>
        {resumo && (
          <span className="indicador-nota">
            {resumo.precisaAjuda} precisam de ajuda · {resumo.pendentes} pendentes
          </span>
        )}
        {semBuscaAtiva && <span className="indicador-nota">sem busca ativa hoje</span>}
      </div>
      <div className="indicador">
        <span className="indicador-rotulo">Cobertura de contatos</span>
        <span className="indicador-valor">{resumo ? porcentagem(resumo.coberturaPercentual) : '—'}</span>
        {resumo && (
          <span className="indicador-nota">
            {resumo.contatados} de {resumo.total} contatadas
          </span>
        )}
      </div>
      <div className="indicador">
        <span className="indicador-rotulo">Setores com nota de calor 5</span>
        <span className="indicador-valor">{setoresNota5 ?? '—'}</span>
        {totalSetores != null && <span className="indicador-nota">de {totalSetores} setores</span>}
      </div>
    </section>
  )
}
