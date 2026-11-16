interface Props {
  atualizadoEm: string | null
  tema: 'claro' | 'escuro'
  onTema: () => void
  usandoMocks: boolean
  /** Alguma atualização automática falhou: os números são os da última busca que deu certo. */
  desatualizado?: boolean
}

const formatar = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Faixa de contexto: cidade, horário da última atualização e tema. */
export function FaixaContexto({ atualizadoEm, tema, onTema, usandoMocks, desatualizado }: Props) {
  return (
    <header className="faixa-contexto">
      <div>
        <h1>Presidente Prudente</h1>
        <p>Central operacional ThermoCity · gêmeo digital</p>
      </div>
      <div className="faixa-direita">
        {usandoMocks && <span className="etiqueta-demo">Dados demonstrativos</span>}
        {desatualizado && (
          <span className="etiqueta-desatualizado" role="status">
            Dados desatualizados · tentando de novo
          </span>
        )}
        <span className="atualizacao" title="Nível, lista e cobertura se atualizam sozinhos a cada minuto">
          Última atualização: {atualizadoEm ? formatar(atualizadoEm) : '—'}
        </span>
        <button type="button" className="botao-tema" onClick={onTema} aria-label={`Usar tema ${tema === 'claro' ? 'escuro' : 'claro'}`}>
          {tema === 'claro' ? '☾' : '☀'}
        </button>
      </div>
    </header>
  )
}
