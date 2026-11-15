import { config } from '../config/env'
import type { EstadoGemeo, PessoaLista, Usuario } from '../types'
import { requisitar } from './http'

/** Chamadas à API Java do gêmeo (ainda não publicada). Setores e serviços vêm de territorioApi. */
export const javaApi = {
  usuarioAtual: () => requisitar<Usuario>(config.apiJavaUrl, '/auth/eu'),
  estado: () => requisitar<EstadoGemeo>(config.apiJavaUrl, '/gemeo/estado'),
  listaDoDia: () => requisitar<{ content: PessoaLista[] }>(config.apiJavaUrl, '/listas/hoje?page=0&size=20').then((p) => p?.content ?? []),
}
