import type { SetorProps } from '../../types'

/** Escala NC1–NC5 do brandbook (derivações do Laranja Sol). Sempre mostrar o código além da cor. */
export const CORES_NC: Record<number, string> = {
  1: '#F0D8CA',
  2: '#ECB49A',
  3: '#E16C42',
  4: '#B85130',
  5: '#853922',
}
export const NOMES_NC: Record<number, string> = { 1: 'Normal', 2: 'Atenção', 3: 'Alerta', 4: 'Alto risco', 5: 'Emergência' }

/** Texto legível sobre cada cor NC (azul no claro, off-white no escuro). */
export const TEXTO_NC: Record<number, string> = { 1: '#1D2F36', 2: '#1D2F36', 3: '#1D2F36', 4: '#F5F0E6', 5: '#F5F0E6' }

export type CamadaPreenchimento = 'calor' | 'ipvs' | 'idosos'

interface ItemLegenda {
  cor: string
  rotulo: string
}

/** Escala azul (derivações do Azul Escuro) para vulnerabilidade e população. */
const AZUIS = ['#DCE4E7', '#B3C3CA', '#7F98A3', '#4E6874', '#1D2F36']
const SEM_DADO = '#CDD2D4'

export const CAMADAS: Record<CamadaPreenchimento, { titulo: string; legenda: ItemLegenda[]; cor: (p: SetorProps) => string }> = {
  calor: {
    titulo: 'Nota de calor do setor',
    legenda: [1, 2, 3, 4, 5].map((n) => ({ cor: CORES_NC[n], rotulo: `${n} – ${['20% mais frescos', 'fresco', 'intermediário', 'quente', '20% mais quentes'][n - 1]}` })),
    cor: (p) => (p.classeCalor ? CORES_NC[p.classeCalor] : SEM_DADO),
  },
  ipvs: {
    titulo: 'Vulnerabilidade social (IPVS)',
    legenda: [
      { cor: AZUIS[0], rotulo: '1 – Baixíssima' },
      { cor: AZUIS[1], rotulo: '2 – Muito baixa' },
      { cor: AZUIS[2], rotulo: '3 – Baixa' },
      { cor: AZUIS[3], rotulo: '4 – Média' },
      { cor: AZUIS[4], rotulo: '5 ou 6 – Alta' },
      { cor: SEM_DADO, rotulo: 'Sem classificação' },
    ],
    cor: (p) => (p.ipvsGrupo ? AZUIS[Math.min(p.ipvsGrupo, 5) - 1] : SEM_DADO),
  },
  idosos: {
    titulo: 'Idosos com 60+ anos',
    legenda: [
      { cor: AZUIS[0], rotulo: 'até 50' },
      { cor: AZUIS[1], rotulo: '51 a 100' },
      { cor: AZUIS[2], rotulo: '101 a 150' },
      { cor: AZUIS[3], rotulo: '151 a 200' },
      { cor: AZUIS[4], rotulo: 'mais de 200' },
      { cor: SEM_DADO, rotulo: 'Suprimido pelo IBGE' },
    ],
    cor: (p) => {
      if (p.pop60mais == null) return SEM_DADO
      const faixas = [50, 100, 150, 200]
      const i = faixas.findIndex((f) => (p.pop60mais ?? 0) <= f)
      return AZUIS[i === -1 ? 4 : i]
    },
  },
}
