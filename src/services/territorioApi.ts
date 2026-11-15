import { config } from '../config/env'
import type { Servico, ServicoProximo, ServicosDoSetor, SetorFeature, SetoresGeoJson } from '../types'
import { requisitar } from './http'

/** Formato devolvido pela base territorial em GET /setores/geojson. */
interface GeoJsonApi {
  type: 'FeatureCollection'
  features: Array<{
    id: string
    geometry: { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] }
    properties: Partial<SetorFeature['properties']> & { codigo: string }
  }>
}

/** Formato de cada item de GET /servicos (ServicoResponse da base territorial). */
interface ServicoApi {
  id: string
  nome: string
  tipo: 'UBS' | 'REFUGIO'
  revisao: string | null
  lat: number
  lon: number
  setorCodigo: string | null
  distanciaMetros?: number | null
}

interface ServicosDoSetorApi {
  codigoSetor: string
  ubsMaisProxima: ServicoApi | null
  refugioMaisProximo: ServicoApi | null
}

const paraServicoProximo = (s: ServicoApi | null): ServicoProximo | null =>
  s && { id: s.id, nome: s.nome, tipo: s.tipo, revisao: s.revisao, lat: s.lat, lon: s.lon, setorCodigo: s.setorCodigo, distanciaMetros: s.distanciaMetros ?? null }

/** Detalhe de cada setor já consultado (um clique repetido não chama a API de novo; falhas não ficam guardadas). */
const servicosPorSetor = new Map<string, Promise<ServicosDoSetor>>()

/**
 * Guarda a resposta de cada chamada para que pedidos repetidos (o React chama tudo duas vezes em
 * desenvolvimento, e as abas Agora e Simulação usam os mesmos dados) reaproveitem um único pedido.
 * Se o pedido falhar, ele é descartado para o "Tentar de novo" chamar a API outra vez.
 */
function umaVez<T>(buscar: () => Promise<T>): () => Promise<T> {
  let emAndamento: Promise<T> | null = null
  return () => {
    emAndamento ??= buscar().catch((erro: unknown) => {
      emAndamento = null
      throw erro
    })
    return emAndamento
  }
}

/**
 * Chamadas à API da base territorial (Java), publicada no Azure.
 * A API manda Polygon para setores de uma parte só; o mapa trabalha sempre com MultiPolygon.
 */
export const territorioApi = {
  setoresGeoJson: umaVez(async (): Promise<SetoresGeoJson> => {
    const dados = await requisitar<GeoJsonApi>(config.apiTerritorioUrl, '/setores/geojson')
    return {
      type: 'FeatureCollection',
      features: dados.features.map((f) => ({
        type: 'Feature',
        id: f.id,
        geometry: {
          type: 'MultiPolygon',
          coordinates: f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates,
        },
        properties: {
          codigo: f.properties.codigo,
          situacao: f.properties.situacao ?? '',
          distrito: f.properties.distrito ?? '',
          pop60mais: f.properties.pop60mais ?? null,
          pop70mais: f.properties.pop70mais ?? null,
          ipvsGrupo: f.properties.ipvsGrupo ?? null,
          classeCalor: f.properties.classeCalor ?? null,
          lstVeraoC: f.properties.lstVeraoC ?? null,
        },
      })),
    }
  }),

  servicos: umaVez(async (): Promise<Servico[]> => {
    const dados = await requisitar<ServicoApi[]>(config.apiTerritorioUrl, '/servicos')
    return dados.map(({ id, nome, tipo, revisao, lat, lon, setorCodigo }) => ({ id, nome, tipo, revisao, lat, lon, setorCodigo }))
  }),

  servicosDoSetor: (codigo: string): Promise<ServicosDoSetor> => {
    let pedido = servicosPorSetor.get(codigo)
    if (!pedido) {
      pedido = requisitar<ServicosDoSetorApi>(config.apiTerritorioUrl, `/setores/${encodeURIComponent(codigo)}/servicos`)
        .then((d) => ({
          codigoSetor: d.codigoSetor,
          ubsMaisProxima: paraServicoProximo(d.ubsMaisProxima),
          refugioMaisProximo: paraServicoProximo(d.refugioMaisProximo),
        }))
        .catch((erro: unknown) => {
          servicosPorSetor.delete(codigo)
          throw erro
        })
      servicosPorSetor.set(codigo, pedido)
    }
    return pedido
  },
}
