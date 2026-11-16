import type { Cobertura, CoberturaSetor, PessoaLista, ResumoCobertura } from '../types'

/** Mesmas regras da API de cadastro: contatados = CONTATADO_BEM + PRECISA_AJUDA; pendentes = sem contato + NAO_ATENDEU. */
function resumir(pessoas: PessoaLista[]): ResumoCobertura {
  const conta = (...status: PessoaLista['status'][]) => pessoas.filter((p) => status.includes(p.status)).length
  const total = pessoas.length
  const contatados = conta('CONTATADO_BEM', 'PRECISA_AJUDA')
  return {
    total,
    contatados,
    pendentes: conta('PENDENTE', 'NAO_ATENDEU'),
    precisaAjuda: conta('PRECISA_AJUDA'),
    naoAtendeu: conta('NAO_ATENDEU'),
    dadosIncorretos: conta('DADOS_INCORRETOS'),
    coberturaPercentual: total ? Math.round((1000 * contatados) / total) / 10 : 0,
  }
}

const agrupar = <K,>(itens: PessoaLista[], chave: (p: PessoaLista) => K) => {
  const grupos = new Map<K, PessoaLista[]>()
  itens.forEach((p) => grupos.set(chave(p), [...(grupos.get(chave(p)) ?? []), p]))
  return grupos
}

/** Cobertura demonstrativa montada a partir da lista mockada (no formato de GET /cobertura/hoje). */
export function coberturaDaLista(lista: PessoaLista[], nivelCalor: number): Cobertura | null {
  if (lista.length === 0) return null
  const ubs = [...agrupar(lista, (p) => p.ubs)].map(([nome, pessoas]) => ({
    ubsId: nome,
    ubsNome: nome,
    resumo: resumir(pessoas),
    setores: [...agrupar(pessoas, (p) => p.setorCodigo)].map(
      ([setorCodigo, doSetor]): CoberturaSetor => ({ setorCodigo, bairro: null, resumo: resumir(doSetor) }),
    ),
  }))
  ubs.sort((a, b) => a.resumo.coberturaPercentual - b.resumo.coberturaPercentual)
  return { data: new Date().toISOString().slice(0, 10), nivelCalor, resumo: resumir(lista), ubs, atualizadoEm: new Date().toISOString() }
}
