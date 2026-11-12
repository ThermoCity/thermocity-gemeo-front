import type { PessoaLista, StatusContato } from '../../types'

const STATUS: Record<StatusContato, string> = {
  PENDENTE: 'Pendente',
  CONTATADO: 'Contatado',
  PRECISA_AJUDA: 'Precisa de ajuda',
  NAO_ATENDEU: 'Não atendeu',
}

interface Props {
  pessoas: PessoaLista[] | null
  carregando: boolean
  erro: string | null
  setorSelecionado: string | null
  onSelecionarSetor: (codigo: string) => void
}

/** Lista do dia com o motivo de cada posição (prioridade explicável). */
export function ContatosPrioritarios({ pessoas, carregando, erro, setorSelecionado, onSelecionarSetor }: Props) {
  return (
    <section className="cartao lista-contatos" aria-labelledby="titulo-contatos">
      <header className="cartao-cabecalho">
        <h2 id="titulo-contatos">Contatos prioritários</h2>
        {pessoas && <span className="contador">{pessoas.length}</span>}
      </header>
      {carregando && <p className="estado-vazio">Carregando lista do dia…</p>}
      {erro && <p className="estado-erro">{erro}</p>}
      {pessoas && pessoas.length === 0 && <p className="estado-vazio">Sem busca ativa hoje.</p>}
      <ol className="contatos">
        {pessoas?.map((p) => (
          <li key={p.pessoaId} className={p.setorCodigo === setorSelecionado ? 'contato ativo' : 'contato'}>
            <button type="button" className="contato-botao" onClick={() => onSelecionarSetor(p.setorCodigo)}>
              <span className="contato-posicao">{p.posicao}</span>
              <span className="contato-corpo">
                <strong>{p.rotulo}</strong>
                <span className="contato-motivos">{p.motivos.join(' · ')}</span>
                <span className="contato-ubs">{p.ubs}</span>
              </span>
              <span className={`status status-${p.status.toLowerCase()}`}>{STATUS[p.status]}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
