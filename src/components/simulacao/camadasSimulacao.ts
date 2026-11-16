import type { SetorProps, SetorSimulado } from '../../types'
import { CORES_NC, SEM_DADO, type DefinicaoCamada } from '../mapa/escalas'

const FORA = { cor: SEM_DADO, rotulo: 'Fora do recorte' }

/** Faixas de quantidade de pessoas (0 | 1–2 | 3–5 | 6–10 | 11+), na escala laranja do brandbook. */
function porQuantidade(titulo: string, valor: (s: SetorSimulado) => number, dados: Map<string, SetorSimulado>): DefinicaoCamada {
  const faixas = [0, 2, 5, 10]
  return {
    titulo,
    legenda: [
      { cor: CORES_NC[1], rotulo: 'nenhum' },
      { cor: CORES_NC[2], rotulo: '1 a 2' },
      { cor: CORES_NC[3], rotulo: '3 a 5' },
      { cor: CORES_NC[4], rotulo: '6 a 10' },
      { cor: CORES_NC[5], rotulo: 'mais de 10' },
      FORA,
    ],
    cor: (p: SetorProps) => {
      const s = dados.get(p.codigo)
      if (!s) return SEM_DADO
      const v = valor(s)
      const i = faixas.findIndex((f) => v <= f)
      return CORES_NC[i === -1 ? 5 : i + 1]
    },
  }
}

/**
 * Camadas do resultado da simulação num dia: idosos sem contato (pendentes), idosos da lista sem
 * refúgio a até 800 m e o índice de calor estimado do setor com o fator k.
 */
export function camadasDaSimulacao(dados: Map<string, SetorSimulado>): Record<string, DefinicaoCamada> {
  return {
    semContato: porQuantidade('Idosos sem contato no dia (pendentes)', (s) => s.pendentes, dados),
    semRefugio: porQuantidade('Idosos da lista sem refúgio a até 800 m', (s) => s.semRefugio800m, dados),
    icEstimado: {
      titulo: 'IC estimado do setor (estimativa com o fator k)',
      legenda: [
        { cor: CORES_NC[1], rotulo: 'abaixo de 35 °C' },
        { cor: CORES_NC[2], rotulo: '35 a 36 °C' },
        { cor: CORES_NC[3], rotulo: '36 a 37 °C' },
        { cor: CORES_NC[4], rotulo: '37 a 38,5 °C' },
        { cor: CORES_NC[5], rotulo: '38,5 °C ou mais' },
        { cor: SEM_DADO, rotulo: 'Sem dado / fora do recorte' },
      ],
      cor: (p: SetorProps) => {
        const ic = dados.get(p.codigo)?.icEstimadoC
        if (ic == null) return SEM_DADO
        const i = [35, 36, 37, 38.5].findIndex((limite) => ic < limite)
        return CORES_NC[i === -1 ? 5 : i + 1]
      },
    },
  }
}
