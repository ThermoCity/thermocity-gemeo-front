import type { CenarioSimulacao, ModoRefugios } from '../../types'

/** Máximo histórico da A707 quando a API não informar (maior IC máximo diário da série 2003–2026). */
export const MAX_HISTORICO_PADRAO = 40.9
export const MAX_DIAS = 15

/** Valores do formulário como o usuário digitou (texto), para validar e destacar campo a campo. */
export interface FormCenario {
  nome: string
  modeloId: string
  dias: string[]
  dataInicio: string
  refugios: ModoRefugios
  agentesPorUbs: string
  contatosPorAgenteDia: string
  fatorK: string
  distrito: string
}

export const FORM_INICIAL: FormCenario = {
  nome: '',
  modeloId: '',
  dias: ['35.5', '36.2', '37.4'],
  dataInicio: '',
  refugios: 'TODOS',
  agentesPorUbs: '2',
  contatosPorAgenteDia: '15',
  fatorK: '0.25',
  distrito: '',
}

/** Erros por campo: "dia-0", "dias", "agentesPorUbs", "contatosPorAgenteDia", "fatorK". */
export type ErrosCenario = Record<string, string>

/** Aceita vírgula ou ponto ("37,5" ou "37.5"); vazio ou inválido = null. */
export function lerNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export const formatar = (n: number, casas = 1) => n.toFixed(casas).replace('.', ',')

/** Mesmas regras da API (POST /simulacoes): o formulário só envia um cenário válido. */
export function validarCenario(f: FormCenario): { erros: ErrosCenario; cenario: CenarioSimulacao | null } {
  const erros: ErrosCenario = {}
  if (f.dias.length === 0) erros.dias = 'Inclua pelo menos um dia.'
  if (f.dias.length > MAX_DIAS) erros.dias = `O cenário pode ter no máximo ${MAX_DIAS} dias.`

  const ic: number[] = []
  f.dias.forEach((texto, i) => {
    const v = lerNumero(texto)
    if (v == null) erros[`dia-${i}`] = 'Informe o índice de calor deste dia.'
    else if (v < 0 || v > 70) erros[`dia-${i}`] = 'Use um valor entre 0 e 70 °C.'
    else ic.push(Math.round(v * 100) / 100)
  })

  const agentes = lerNumero(f.agentesPorUbs)
  if (agentes == null || !Number.isInteger(agentes) || agentes < 1 || agentes > 50) {
    erros.agentesPorUbs = 'Informe de 1 a 50 agentes por UBS.'
  }
  const contatos = lerNumero(f.contatosPorAgenteDia)
  if (contatos == null || !Number.isInteger(contatos) || contatos < 1 || contatos > 100) {
    erros.contatosPorAgenteDia = 'Informe de 1 a 100 contatos por agente por dia.'
  }
  const k = lerNumero(f.fatorK)
  if (k == null || k < 0.1 || k > 0.5) erros.fatorK = 'O fator k vai de 0,10 a 0,50.'

  if (Object.keys(erros).length > 0) return { erros, cenario: null }
  return {
    erros,
    cenario: {
      nome: f.nome.trim() || undefined,
      modeloId: f.modeloId || undefined,
      icMaxPorDia: ic,
      dataInicio: f.dataInicio || undefined,
      refugios: f.refugios,
      agentesPorUbs: agentes!,
      contatosPorAgenteDia: contatos!,
      fatorK: k!,
      distrito: f.distrito || undefined,
    },
  }
}

/** Traduz os "detalhes" de um 400 da API ("icMaxPorDia[1]: ...", "agentesPorUbs: ...") para os campos do formulário. */
export function errosDaApi(detalhes: string[]): ErrosCenario {
  const erros: ErrosCenario = {}
  for (const d of detalhes) {
    const [campo, ...resto] = d.split(':')
    const mensagem = resto.join(':').trim() || d
    const dia = /^icMaxPorDia\[(\d+)\]/.exec(campo)
    if (dia) erros[`dia-${dia[1]}`] = mensagem
    else if (campo === 'icMaxPorDia') erros.dias = mensagem
    else if (['agentesPorUbs', 'contatosPorAgenteDia', 'fatorK', 'distrito'].includes(campo)) erros[campo] = mensagem
  }
  return erros
}

/** Índices dos dias acima do máximo histórico da A707. */
export function diasExtrapolados(f: FormCenario, maxHistorico: number): number[] {
  return f.dias.flatMap((texto, i) => {
    const v = lerNumero(texto)
    return v != null && v > maxHistorico ? [i] : []
  })
}
