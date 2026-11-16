import type { Cobertura, CoberturaSetor, ResumoCobertura, SetorProps } from '../../types'
import { CORES_NC, SEM_DADO, type DefinicaoCamada } from '../mapa/escalas'

/** Cobertura de um setor no dia (somada, caso o setor apareça em mais de uma UBS) e as UBS que o atendem. */
export interface CoberturaDoSetor {
  resumo: ResumoCobertura
  ubs: string[]
  bairro: string | null
}

function somar(a: ResumoCobertura, b: ResumoCobertura): ResumoCobertura {
  const total = a.total + b.total
  const contatados = a.contatados + b.contatados
  return {
    total,
    contatados,
    pendentes: a.pendentes + b.pendentes,
    precisaAjuda: a.precisaAjuda + b.precisaAjuda,
    naoAtendeu: a.naoAtendeu + b.naoAtendeu,
    dadosIncorretos: a.dadosIncorretos + b.dadosIncorretos,
    coberturaPercentual: total ? Math.round((1000 * contatados) / total) / 10 : 0,
  }
}

/** Índice código do setor → cobertura do dia. */
export function coberturaPorSetor(cobertura: Cobertura | null): Map<string, CoberturaDoSetor> {
  const mapa = new Map<string, CoberturaDoSetor>()
  cobertura?.ubs.forEach((u) =>
    u.setores.forEach((s: CoberturaSetor) => {
      const atual = mapa.get(s.setorCodigo)
      mapa.set(
        s.setorCodigo,
        atual
          ? { resumo: somar(atual.resumo, s.resumo), ubs: [...atual.ubs, u.ubsNome], bairro: atual.bairro ?? s.bairro }
          : { resumo: s.resumo, ubs: [u.ubsNome], bairro: s.bairro },
      )
    }),
  )
  return mapa
}

export const porcentagem = (valor: number) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

/** Faixas de cobertura: quanto menos contatos, mais escuro (onde reforçar a equipe). */
const FAIXAS = [
  { ate: 25, cor: CORES_NC[5], rotulo: 'até 25% contatados' },
  { ate: 50, cor: CORES_NC[4], rotulo: '25 a 50%' },
  { ate: 75, cor: CORES_NC[3], rotulo: '50 a 75%' },
  { ate: 99.9, cor: CORES_NC[2], rotulo: '75 a 99%' },
  { ate: 100, cor: CORES_NC[1], rotulo: 'todos contatados' },
]

/** Camada do mapa “Cobertura da busca ativa hoje”, a partir de GET /cobertura/hoje. */
export function camadaCobertura(porSetor: Map<string, CoberturaDoSetor>): DefinicaoCamada {
  return {
    titulo: 'Cobertura da busca ativa hoje',
    legenda: [...FAIXAS.map(({ cor, rotulo }) => ({ cor, rotulo })), { cor: SEM_DADO, rotulo: 'Sem pessoas na lista' }],
    cor: (p: SetorProps) => {
      const c = porSetor.get(p.codigo)
      if (!c || c.resumo.total === 0) return SEM_DADO
      return (FAIXAS.find((f) => c.resumo.coberturaPercentual <= f.ate) ?? FAIXAS[FAIXAS.length - 1]).cor
    },
  }
}
