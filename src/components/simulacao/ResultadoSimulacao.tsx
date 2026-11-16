import type { SimulacaoDetalhe } from '../../types'
import { SeloNivel } from '../painel/Indicadores'
import { formatar } from './cenario'

const REFUGIOS = { TODOS: 'todos os refúgios', PUBLICOS: 'só refúgios públicos', NENHUM: 'nenhum refúgio' } as const

const numero = (n: number | null) => (n == null ? '—' : n.toLocaleString('pt-BR'))
const data = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : null)

/** Resultado da simulação, dia a dia: nível de calor, lista, contatos e acesso a refúgio. */
export function ResultadoSimulacao({ simulacao: s }: { simulacao: SimulacaoDetalhe }) {
  const c = s.cenario
  return (
    <section className="cartao resultado-simulacao" aria-labelledby="titulo-resultado" tabIndex={-1}>
      <header className="cartao-cabecalho">
        <div>
          <h2 id="titulo-resultado">{s.nome}</h2>
          <p className="nota">
            Simulação nº {s.id} · {c.qtdDias} dias · {c.agentesPorUbs} agente(s) por UBS × {c.contatosPorAgenteDia} contatos/dia ·{' '}
            {REFUGIOS[c.refugios]} · {c.distrito ? `distrito ${c.distrito}` : 'cidade toda'} · k = {formatar(c.fatorK, 2)}
          </p>
        </div>
        <SeloNivel nivel={s.nivelMaximo} nome="máximo" />
      </header>

      {s.diasExtrapolados > 0 && (
        <p className="aviso-extrapolacao">
          {s.diasExtrapolados === 1 ? '1 dia passa' : `${s.diasExtrapolados} dias passam`} do máximo histórico da A707
          {s.maxHistoricoIcC != null && ` (${formatar(s.maxHistoricoIcC, 2)} °C)`}: extrapolação.
        </p>
      )}

      <div className="tabela-rolagem">
        <table className="tabela-resultado">
          <thead>
            <tr>
              <th scope="col">Dia</th>
              <th scope="col">IC máx.</th>
              <th scope="col">Nível</th>
              <th scope="col">Na lista</th>
              <th scope="col">Contatadas</th>
              <th scope="col">Pendentes</th>
              <th scope="col">Sem refúgio a até 800 m</th>
            </tr>
          </thead>
          <tbody>
            {s.dias.map((d) => (
              <tr key={d.dia}>
                <th scope="row">
                  {d.dia}
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
        Pessoas do cadastro sintético (fictícias). Quem fica pendente entra na frente da fila do dia seguinte. Distância ao refúgio em
        linha reta. {s.diasExtrapolados > 0 && '* acima do máximo histórico da A707.'}
      </p>
    </section>
  )
}
