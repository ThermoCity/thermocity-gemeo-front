/** Tipos do domínio, no formato que as APIs Java e .NET vão devolver. */

export type Papel = 'CIDADAO' | 'AGENTE' | 'GESTOR' | 'COLETOR'

export interface Usuario {
  nome: string
  email: string
  papel: Papel
}

/** Nível de calor da cidade (NC1 a NC5), calculado pela API de clima. */
export type NivelCalor = 1 | 2 | 3 | 4 | 5

export interface NivelDia {
  data: string // AAAA-MM-DD
  nivel: NivelCalor
  nome: string
  icMaxC: number
  origem: 'OBSERVADO' | 'PREVISTO'
}

export interface SituacaoClima {
  hoje: NivelDia
  proximosDias: NivelDia[]
  criterio: string
  acaoEsperada: string
  atualizadoEm: string // ISO
  desatualizado: boolean
}

/** Propriedades de cada setor no GeoJSON de GET /setores/geojson. */
export interface SetorProps {
  codigo: string
  situacao: string
  distrito: string
  pop60mais: number | null
  pop70mais: number | null
  ipvsGrupo: number | null
  /** Nota de calor do setor (1 = 20% mais frescos ... 5 = 20% mais quentes). Não é o nível NC. */
  classeCalor: number | null
  lstVeraoC: number | null
}

export interface SetorFeature {
  type: 'Feature'
  id: string
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] }
  properties: SetorProps
}

export interface SetoresGeoJson {
  type: 'FeatureCollection'
  features: SetorFeature[]
}

export interface Servico {
  id: string
  nome: string
  tipo: 'UBS' | 'REFUGIO'
  revisao: string | null
  lat: number
  lon: number
  setorCodigo: string | null
}

export type StatusContato = 'PENDENTE' | 'CONTATADO' | 'PRECISA_AJUDA' | 'NAO_ATENDEU'

export interface PessoaLista {
  posicao: number
  pessoaId: string
  rotulo: string // nunca o nome completo no painel
  setorCodigo: string
  ubs: string
  pontuacao: number
  motivos: string[]
  status: StatusContato
}

/** Resumo do estado atual da cidade (GET /gemeo/estado). */
export interface EstadoGemeo {
  pessoasNaLista: number
  contatadas: number
  precisaAjuda: number
  semRefugioProximo: number
  setoresNota5: number
  atualizadoEm: string
}
