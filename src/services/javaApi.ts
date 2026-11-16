import { config } from '../config/env'
import type { EstadoGemeo, PessoaLista, StatusContato } from '../types'
import { requisitar } from './http'

/** Item de GET /listas/hoje da API de cadastro (só os campos que o painel usa). */
interface ItemListaApi {
  id: number
  posicao: number
  pontuacao: number
  /** Motivos separados por " · " (ex.: "mora sozinho · 70 anos · setor nota 5"). */
  motivos: string
  statusContato: StatusContato
  ubsNome: string
  setorCodigo: string
  pessoa: { id: number; nome: string; idade: number } | null
  refugioMaisProximo: { nome: string; distanciaMetros: number } | null
}

/** Resposta de GET /listas/hoje: a lista do dia (uma por UBS) com os itens paginados. */
interface ListaHojeApi {
  data: string
  nivelCalor: number
  versaoRegra: string
  itens: { conteudo: ItemListaApi[]; pagina: number; tamanho: number; totalElementos: number; totalPaginas: number }
}

/**
 * Nome abreviado para o painel do gestor (LGPD): "Lourdes Rocha Alves" vira "Lourdes R. A.".
 * O nome completo e o telefone ficam só no app do agente, que faz o contato.
 */
export function abreviarNome(nome: string | null | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return 'Pessoa sem nome'
  return [partes[0], ...partes.slice(1).map((p) => `${p[0].toUpperCase()}.`)].join(' ')
}

export function paraPessoaLista(item: ItemListaApi): PessoaLista {
  return {
    posicao: item.posicao,
    pessoaId: String(item.pessoa?.id ?? `item-${item.id}`),
    rotulo: item.pessoa ? abreviarNome(item.pessoa.nome) : 'Pessoa excluída (LGPD)',
    setorCodigo: item.setorCodigo,
    ubs: item.ubsNome,
    pontuacao: item.pontuacao,
    motivos: item.motivos ? item.motivos.split(' · ').map((m) => m.trim()).filter(Boolean) : [],
    status: item.statusContato,
    refugioMetros: item.refugioMaisProximo?.distanciaMetros ?? null,
  }
}

/** Chamadas à API Java de cadastro. Setores, serviços e simulações vêm de territorioApi. */
export const javaApi = {
  estado: () => requisitar<EstadoGemeo>(config.apiJavaUrl, '/gemeo/estado'),
  /** Primeiros 20 da lista do dia de todas as UBS (gestor). Sem lista no dia a API responde 204: lista vazia. */
  listaDoDia: () =>
    requisitar<ListaHojeApi | undefined>(config.apiJavaUrl, '/listas/hoje?page=0&size=20').then((r) =>
      (r?.itens?.conteudo ?? []).map(paraPessoaLista),
    ),
}
