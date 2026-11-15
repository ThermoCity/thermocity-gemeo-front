import { useCallback } from 'react'
import { useDados } from '../../hooks/useDados'
import { api } from '../../services'
import type { ServicoProximo, SetorProps } from '../../types'
import { ROTULOS_IPVS, ROTULOS_NOTA } from '../mapa/escalas'

interface Props {
  setor: SetorProps
  onFechar: () => void
}

/** Distância a pé considerada "perto de um refúgio" no ThermoCity (mesma regra do motor de simulação). */
const DISTANCIA_REFUGIO_M = 800

const metros = (m: number | null) => (m == null ? '' : m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`)

/** Detalhe do setor clicado no mapa: população 60+, IPVS, nota de calor e serviços mais próximos. */
export function DetalheSetor({ setor, onFechar }: Props) {
  const buscar = useCallback(() => api.servicosDoSetor(setor.codigo), [setor.codigo])
  const proximos = useDados(buscar)

  return (
    <section className="cartao detalhe-setor" aria-labelledby="titulo-setor">
      <header className="cartao-cabecalho">
        <h2 id="titulo-setor">Setor {setor.codigo}</h2>
        <button type="button" className="botao-icone" onClick={onFechar} aria-label="Fechar detalhe do setor">
          ×
        </button>
      </header>
      <dl className="detalhe-lista">
        <dt>Situação</dt>
        <dd>
          {setor.situacao} · {setor.distrito}
        </dd>
        <dt>Idosos 60+</dt>
        <dd>
          {setor.pop60mais ?? 'Suprimido pelo IBGE'}
          {setor.pop70mais != null && ` (70+: ${setor.pop70mais})`}
        </dd>
        <dt>Vulnerabilidade (IPVS)</dt>
        <dd>{setor.ipvsGrupo ? `Grupo ${setor.ipvsGrupo} – ${ROTULOS_IPVS[setor.ipvsGrupo] ?? ''}` : 'Sem classificação'}</dd>
        <dt>Nota de calor</dt>
        <dd>
          {setor.classeCalor ? `${setor.classeCalor} de 5 – ${ROTULOS_NOTA[setor.classeCalor]}` : 'Sem dado'}
          {setor.lstVeraoC != null && ` · superfície ${setor.lstVeraoC.toFixed(1).replace('.', ',')} °C`}
        </dd>
        <dt>Refúgio mais próximo</dt>
        <dd>
          <Proximo estado={proximos} servico={proximos.dados?.refugioMaisProximo} vazio="Nenhum refúgio público cadastrado" alertaAcimaDe={DISTANCIA_REFUGIO_M} />
        </dd>
        <dt>UBS de referência</dt>
        <dd>
          <Proximo estado={proximos} servico={proximos.dados?.ubsMaisProxima} vazio="Nenhuma UBS cadastrada" />
        </dd>
      </dl>
      {proximos.erro && (
        <p className="nota estado-erro">
          Não foi possível buscar os serviços próximos ({proximos.erro}).{' '}
          <button type="button" className="botao-link" onClick={proximos.recarregar}>
            Tentar de novo
          </button>
        </p>
      )}
      <p className="nota">
        Distâncias em linha reta a partir do ponto de referência do setor. A temperatura de superfície (Landsat, 08/01/2024) serve para comparar
        setores; não é a temperatura do ar.
      </p>
    </section>
  )
}

interface ProximoProps {
  estado: { carregando: boolean; erro: string | null }
  servico: ServicoProximo | null | undefined
  vazio: string
  alertaAcimaDe?: number
}

function Proximo({ estado, servico, vazio, alertaAcimaDe }: ProximoProps) {
  if (estado.carregando) return <span className="texto-suave">Buscando…</span>
  if (estado.erro) return <span className="texto-suave">—</span>
  if (!servico) return <span className="texto-suave">{vazio}</span>
  const longe = alertaAcimaDe != null && servico.distanciaMetros != null && servico.distanciaMetros > alertaAcimaDe
  return (
    <>
      {servico.nome} · {metros(servico.distanciaMetros)}
      {longe && <span className="etiqueta-alerta"> a mais de {alertaAcimaDe} m</span>}
    </>
  )
}
