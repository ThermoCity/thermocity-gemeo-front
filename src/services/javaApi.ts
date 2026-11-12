import { config } from '../config/env'
import type { EstadoGemeo, PessoaLista, Servico, SetoresGeoJson, Usuario } from '../types'
import { requisitar } from './http'

/** Chamadas à API Java (base-territorial / gêmeo). Endpoints previstos no backlog. */
export const javaApi = {
  usuarioAtual: () => requisitar<Usuario>(config.apiJavaUrl, '/auth/eu'),
  setoresGeoJson: () => requisitar<SetoresGeoJson>(config.apiJavaUrl, '/setores/geojson'),
  servicos: () => requisitar<Servico[]>(config.apiJavaUrl, '/servicos'),
  estado: () => requisitar<EstadoGemeo>(config.apiJavaUrl, '/gemeo/estado'),
  listaDoDia: () => requisitar<{ content: PessoaLista[] }>(config.apiJavaUrl, '/listas/hoje?page=0&size=20').then((p) => p?.content ?? []),
}
