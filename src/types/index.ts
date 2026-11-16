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

/** Serviço com a distância em linha reta (metros) até o ponto de referência do setor. */
export interface ServicoProximo extends Servico {
  distanciaMetros: number | null
}

/** UBS e refúgio mais próximos de um setor (GET /setores/{codigo}/servicos). */
export interface ServicosDoSetor {
  codigoSetor: string
  ubsMaisProxima: ServicoProximo | null
  /** Só refúgios públicos confirmados. */
  refugioMaisProximo: ServicoProximo | null
}

/** Situação do contato na lista do dia (enum StatusContato da API de cadastro). */
export type StatusContato = 'PENDENTE' | 'CONTATADO_BEM' | 'PRECISA_AJUDA' | 'NAO_ATENDEU' | 'DADOS_INCORRETOS'

export interface PessoaLista {
  posicao: number
  pessoaId: string
  rotulo: string // nunca o nome completo no painel
  setorCodigo: string
  ubs: string
  pontuacao: number
  motivos: string[]
  status: StatusContato
  /** Distância até o refúgio mais próximo, em metros (nula se não houver). */
  refugioMetros?: number | null
}

/** Contagens da busca ativa (GET /cobertura/hoje da API de cadastro). */
export interface ResumoCobertura {
  total: number
  /** CONTATADO_BEM + PRECISA_AJUDA */
  contatados: number
  /** ainda sem contato + NAO_ATENDEU */
  pendentes: number
  precisaAjuda: number
  naoAtendeu: number
  dadosIncorretos: number
  /** contatados / total, em % (uma casa decimal) */
  coberturaPercentual: number
}

export interface CoberturaSetor {
  setorCodigo: string
  bairro: string | null
  resumo: ResumoCobertura
}

export interface CoberturaUbs {
  ubsId: string
  ubsNome: string
  resumo: ResumoCobertura
  setores: CoberturaSetor[]
}

/** Cobertura do dia: total, por UBS (da menor para a maior cobertura) e por setor. */
export interface Cobertura {
  data: string
  /** Maior nível de calor entre as listas do dia. */
  nivelCalor: number
  resumo: ResumoCobertura
  ubs: CoberturaUbs[]
  /** Hora em que o painel buscou os dados (preenchido pelo front). */
  atualizadoEm: string
}

/* ---------------------------------------------------------------- Simulação (base territorial) */

/** Um dia de um modelo pronto de onda de calor (GET /simulacoes/modelos). */
export interface DiaModelo {
  dia: number
  data: string
  icMaxC: number
  nivel: NivelCalor
  nome: string
  /** false nos dias de entrada e saída que acompanham o episódio. */
  parteDoEpisodio: boolean
  /** IC acima do maior valor já registrado na estação A707. */
  extrapolacao: boolean
}

export interface ModeloOndaCalor {
  id: string
  nome: string
  tipo: 'REAL' | 'VARIACAO'
  acrescimoC: number
  inicioEpisodio: string
  fimEpisodio: string
  diasEpisodio: number
  nivelMaximo: NivelCalor
  icMaxC: number
  diasExtrapolados: number
  dias: DiaModelo[]
}

export interface ModelosOndaCalor {
  fonte: string
  versaoLimiar: string
  /** Maior IC máximo diário da A707; acima dele o dia é extrapolação. */
  maxHistoricoC: number | null
  modelos: ModeloOndaCalor[]
}

export type ModoRefugios = 'TODOS' | 'PUBLICOS' | 'NENHUM'

/** Corpo de POST /simulacoes. */
export interface CenarioSimulacao {
  nome?: string
  modeloId?: string
  icMaxPorDia: number[]
  dataInicio?: string
  refugios: ModoRefugios
  agentesPorUbs: number
  contatosPorAgenteDia: number
  fatorK: number
  distrito?: string
}

export type StatusSimulacao = 'PROCESSANDO' | 'CONCLUIDA' | 'ERRO'

export interface SimulacaoResumo {
  id: number
  nome: string
  status: StatusSimulacao
  qtdDias: number
  nivelMaximo: NivelCalor
  diasExtrapolados: number
}

export interface DiaSimulado {
  dia: number
  data: string | null
  icMaxC: number
  nivel: NivelCalor
  nome: string
  regra: string
  extrapolacao: boolean
  pessoasNaLista: number | null
  contatadas: number | null
  pendentes: number | null
  semRefugio800m: number | null
}

export interface SetorSimulado {
  dia: number
  codigoSetor: string
  pessoasNaLista: number
  contatadas: number
  pendentes: number
  semRefugio800m: number
  /** IC do setor estimado com o fator k (estimativa). */
  icEstimadoC: number | null
}

/** Resultado de GET /simulacoes/{id}. */
export interface SimulacaoDetalhe {
  id: number
  nome: string
  status: StatusSimulacao
  criadoEm: string
  cenario: {
    modeloId: string | null
    dataInicio: string | null
    qtdDias: number
    refugios: ModoRefugios
    agentesPorUbs: number
    contatosPorAgenteDia: number
    fatorK: number
    distrito: string | null
  }
  versaoLimiar: string
  maxHistoricoIcC: number | null
  nivelMaximo: NivelCalor
  diasExtrapolados: number
  dias: DiaSimulado[]
  setores: SetorSimulado[]
}
