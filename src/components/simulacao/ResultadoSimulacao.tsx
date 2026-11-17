import type { DiaSimulado, SimulacaoDetalhe } from '../../types'
import { SeloNivel } from '../painel/Indicadores'
import { formatar } from './cenario'
import { LinhaDoTempo } from './LinhaDoTempo'

const REFUGIOS = { TODOS: 'todos os refúgios', PUBLICOS: 'só refúgios públicos', NENHUM: 'nenhum refúgio' } as const

const numero = (n: number | null) => (n == null ? '—' : n.toLocaleString('pt-BR'))
const data = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : null)

interface Props {
  simulacao: SimulacaoDetalhe
  /** Dia mostrado no mapa; clicar num dia da linha do tempo ou da tabela troca o dia. */
  diaSelecionado: number
  onDia: (dia: number) => void
}

/** Dia com mais pessoas sem contato (empate: o primeiro). Sem pendentes, o dia com a maior lista. */
export function piorDia(dias: DiaSimulado[]): DiaSimulado | undefined {
  const pendentes = (d: DiaSimulado) => d.pendentes ?? 0
  const lista = (d: DiaSimulado) => d.pessoasNaLista ?? 0
  if (dias.length === 0) return undefined
  const algumPendente = dias.some((d) => pendentes(d) > 0)
  const medida = algumPendente ? pendentes : lista
  return dias.reduce((pior, d) => (medida(d) > medida(pior) ? d : pior), dias[0])
}

/** Resultado da simulação: primeiro a resposta (números do pior dia), depois a linha do tempo e, se quiser, a tabela. */
export function ResultadoSimulacao({ simulacao: s, diaSelecionado, onDia }: Props) {
  const c = s.cenario
  const pior = piorDia(s.dias)
  const maxSemRefugio = Math.max(0, ...s.dias.map((d) => d.semRefugio800m ?? 0))
  const diasBusca = s.dias.filter((d) => d.nivel >= 3).length
  const ligacoes = s.dias.reduce((t, d) => t + (d.contatadas ?? 0), 0)
  const semBusca = diasBusca === 0

  return (
    <section className="cartao resultado-simulacao" aria-labelledby="titulo-resultado" tabIndex={-1}>
      <header className="cartao-cabecalho">
        <div>
          <h2 id="titulo-resultado">Resultado: {s.nome}</h2>
          <ul className="chips-cenario" aria-label="Parâmetros do cenário">
            <li>Simulação nº {s.id}</li>
            <li>{c.qtdDias} dias</li>
            <li>
              {c.agentesPorUbs} agente(s) × {c.contatosPorAgenteDia} contatos/dia por UBS
            </li>
            <li>{REFUGIOS[c.refugios]}</li>
            <li>{c.distrito ? `distrito ${c.distrito}` : 'cidade toda'}</li>
          </ul>
        </div>
        <SeloNivel nivel={s.nivelMaximo} nome="máximo" />
      </header>

      {semBusca ? (
        <p className="resultado-manchete">Nenhum dia chegou ao NC3: neste cenário não haveria busca ativa.</p>
      ) : (
        pior && (
          <p className="resultado-manchete">
            No pior dia (dia {pior.dia}, NC{pior.nivel}), <strong>{numero(pior.pendentes)}</strong> das {numero(pior.pessoasNaLista)} pessoas
            da lista ficariam sem contato.
          </p>
        )
      )}

      <div className="resultado-kpis">
        <div className="kpi">
          <span className="kpi-rotulo">Sem contato no pior dia</span>
          <strong className="kpi-valor kpi-alerta">{numero(pior?.pendentes ?? 0)}</strong>
          <span className="kpi-nota">{pior && !semBusca ? `dia ${pior.dia} · ${numero(pior.pessoasNaLista)} na lista` : 'sem busca ativa'}</span>
        </div>
        <div className="kpi">
          <span className="kpi-rotulo">Idosos longe de um refúgio</span>
          <strong className="kpi-valor">{numero(maxSemRefugio)}</strong>
          <span className="kpi-nota">no pior dia, a mais de 800 m</span>
        </div>
        <div className="kpi">
          <span className="kpi-rotulo">Dias com busca ativa</span>
          <strong className="kpi-valor">
            {diasBusca} de {s.dias.length}
          </strong>
          <span className="kpi-nota">nível NC3 ou mais</span>
        </div>
        <div className="kpi">
          <span className="kpi-rotulo">Ligações feitas no período</span>
          <strong className="kpi-valor">{numero(ligacoes)}</strong>
          <span className="kpi-nota">pela capacidade das equipes</span>
        </div>
      </div>

      {s.diasExtrapolados > 0 && (
        <p className="aviso-extrapolacao">
          {s.diasExtrapolados === 1 ? '1 dia passa' : `${s.diasExtrapolados} dias passam`} do máximo histórico da A707
          {s.maxHistoricoIcC != null && ` (${formatar(s.maxHistoricoIcC, 2)} °C)`}: extrapolação.
        </p>
      )}

      <div className="resultado-legenda" aria-hidden="true">
        <span>
          <i className="legenda-contatadas" /> contatadas
        </span>
        <span>
          <i className="legenda-pendentes" /> sem contato
        </span>
        <span>Clique num dia para vê-lo no mapa.</span>
      </div>
      <LinhaDoTempo dias={s.dias} diaSelecionado={diaSelecionado} onDia={onDia} />

      <details className="detalhes">
        <summary>Ver tabela dia a dia</summary>
        <div className="tabela-rolagem">
          <table className="tabela-resultado">
            <thead>
              <tr>
                <th scope="col">Dia</th>
                <th scope="col">IC máx.</th>
                <th scope="col">Nível</th>
                <th scope="col">Na lista</th>
                <th scope="col">Contatadas</th>
                <th scope="col">Sem contato</th>
                <th scope="col">Sem refúgio a até 800 m</th>
              </tr>
            </thead>
            <tbody>
              {s.dias.map((d) => (
                <tr key={d.dia} className={d.dia === diaSelecionado ? 'linha-ativa' : undefined}>
                  <th scope="row">
                    <button type="button" className="botao-link" onClick={() => onDia(d.dia)} aria-label={`Ver o dia ${d.dia} no mapa`}>
                      {d.dia}
                    </button>
                    {data(d.data) && <small> · {data(d.data)}</small>}
                  </th>
                  <td>
                    {formatar(d.icMaxC)} °C
                    {d.extrapolacao && <span className="etiqueta-alerta" title="Acima do máximo histórico da A707"> *</span>}
                  </td>
                  <td>
                    <SeloNivel nivel={d.nivel} nome={d.nome} />
                  </td>
                  <td>{numero(d.pessoasNaLista)}</td>
                  <td>{numero(d.contatadas)}</td>
                  <td className={d.pendentes ? 'etiqueta-alerta' : undefined}>{numero(d.pendentes)}</td>
                  <td>{numero(d.semRefugio800m)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota">
          Pessoas do cadastro sintético (fictícias). Quem fica sem contato entra na frente da fila do dia seguinte. Distância ao refúgio em
          linha reta. {s.diasExtrapolados > 0 && '* acima do máximo histórico da A707.'}
        </p>
      </details>
    </section>
  )
}
