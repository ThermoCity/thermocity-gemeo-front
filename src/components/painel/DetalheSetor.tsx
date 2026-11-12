import type { Servico, SetorProps } from '../../types'

interface Props {
  setor: SetorProps
  servicos: Servico[]
  onFechar: () => void
}

export function DetalheSetor({ setor, servicos, onFechar }: Props) {
  const noSetor = servicos.filter((s) => s.setorCodigo === setor.codigo)
  return (
    <section className="cartao detalhe-setor" aria-labelledby="titulo-setor">
      <header className="cartao-cabecalho">
        <h2 id="titulo-setor">Setor {setor.codigo}</h2>
        <button type="button" className="botao-icone" onClick={onFechar} aria-label="Fechar detalhe do setor">
          ×
        </button>
      </header>
      <dl className="detalhe-lista">
        <dt>Situação</dt>
        <dd>{setor.situacao} · {setor.distrito}</dd>
        <dt>Nota de calor</dt>
        <dd>{setor.classeCalor ?? '—'} de 5{setor.lstVeraoC != null && ` · superfície ${setor.lstVeraoC.toFixed(1).replace('.', ',')} °C`}</dd>
        <dt>Vulnerabilidade (IPVS)</dt>
        <dd>{setor.ipvsGrupo ? `Grupo ${setor.ipvsGrupo}` : 'Sem classificação'}</dd>
        <dt>Idosos 60+</dt>
        <dd>{setor.pop60mais ?? 'Suprimido pelo IBGE'}{setor.pop70mais != null && ` (70+: ${setor.pop70mais})`}</dd>
        <dt>Serviços no setor</dt>
        <dd>{noSetor.length ? noSetor.map((s) => s.nome).join(', ') : 'Nenhum'}</dd>
      </dl>
      <p className="nota">A temperatura de superfície (Landsat, 08/01/2024) serve para comparar setores; não é a temperatura do ar.</p>
    </section>
  )
}
