import type { SetorProps, SetorSimulado } from '../../types'
import { formatar } from './cenario'

interface Props {
  setor: SetorProps
  dia: number
  dados: SetorSimulado | undefined
  carregando: boolean
  onFechar: () => void
}

/** Números de um setor no dia escolhido do mapa da simulação. */
export function DetalheSetorSimulado({ setor, dia, dados, carregando, onFechar }: Props) {
  return (
    <section className="cartao detalhe-flutuante" aria-labelledby="titulo-setor-simulado" aria-live="polite">
      <header className="cartao-cabecalho">
        <h3 id="titulo-setor-simulado">
          Setor {setor.codigo.slice(-4)} · dia {dia}
        </h3>
        <button type="button" className="botao-icone" onClick={onFechar} aria-label="Fechar detalhe do setor">
          ×
        </button>
      </header>
      {carregando ? (
        <p className="nota">Carregando o dia {dia}…</p>
      ) : !dados ? (
        <p className="nota">Este setor está fora do recorte da simulação.</p>
      ) : (
        <dl className="detalhe-lista">
          <dt>Na lista do dia</dt>
          <dd>{dados.pessoasNaLista}</dd>
          <dt>Contatadas</dt>
          <dd>{dados.contatadas}</dd>
          <dt>Sem contato (pendentes)</dt>
          <dd className={dados.pendentes ? 'etiqueta-alerta' : undefined}>{dados.pendentes}</dd>
          <dt>Sem refúgio a até 800 m</dt>
          <dd>{dados.semRefugio800m}</dd>
          <dt>IC estimado (k)</dt>
          <dd>{dados.icEstimadoC != null ? `${formatar(dados.icEstimadoC)} °C` : 'sem dado'}</dd>
          <dt>Idosos 60+ (Censo)</dt>
          <dd>{setor.pop60mais ?? 'suprimido'}</dd>
          <dt>IPVS · nota de calor</dt>
          <dd>
            {setor.ipvsGrupo ?? '—'} · {setor.classeCalor ?? '—'}
          </dd>
        </dl>
      )}
      <p className="nota">Pessoas fictícias do cadastro sintético. IC estimado é uma estimativa.</p>
    </section>
  )
}
