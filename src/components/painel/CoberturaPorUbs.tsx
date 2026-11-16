import type { Cobertura } from '../../types'
import { porcentagem } from './coberturaMapa'

interface Props {
  cobertura: Cobertura | null
  carregando: boolean
  erro: string | null
  onTentarDeNovo: () => void
}

/** Cobertura por UBS, da menor para a maior: onde reforçar a equipe primeiro. */
export function CoberturaPorUbs({ cobertura, carregando, erro, onTentarDeNovo }: Props) {
  return (
    <section className="cartao cobertura-ubs" aria-labelledby="titulo-cobertura">
      <header className="cartao-cabecalho">
        <h2 id="titulo-cobertura">Cobertura por UBS</h2>
        {cobertura && <span className="contador">{cobertura.ubs.length}</span>}
      </header>
      {carregando && <p className="estado-vazio">Carregando cobertura do dia…</p>}
      {erro && (
        <p className="estado-erro">
          {erro}{' '}
          <button type="button" className="botao-link" onClick={onTentarDeNovo}>
            Tentar de novo
          </button>
        </p>
      )}
      {!carregando && !erro && !cobertura && <p className="estado-vazio">Sem busca ativa hoje.</p>}
      {cobertura && (
        <ul className="ubs-cobertura">
          {cobertura.ubs.map((u) => (
            <li key={u.ubsId}>
              <div className="ubs-linha">
                <span className="ubs-nome">{u.ubsNome}</span>
                <strong>{porcentagem(u.resumo.coberturaPercentual)}</strong>
              </div>
              <div
                className="barra-cobertura"
                role="progressbar"
                aria-label={`Cobertura da ${u.ubsNome}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={u.resumo.coberturaPercentual}
              >
                <span style={{ width: `${Math.min(u.resumo.coberturaPercentual, 100)}%` }} />
              </div>
              <span className="ubs-detalhe">
                {u.resumo.contatados} de {u.resumo.total} contatadas · {u.resumo.pendentes} pendentes
                {u.resumo.precisaAjuda > 0 && <span className="etiqueta-alerta"> · {u.resumo.precisaAjuda} precisam de ajuda</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
