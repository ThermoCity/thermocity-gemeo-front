import { useState } from 'react'
import type { CenarioSimulacao, ModoRefugios, SimulacaoDetalhe } from '../../types'

const REFUGIOS: Record<ModoRefugios, string> = { TODOS: 'todos os refúgios', PUBLICOS: 'só os refúgios públicos', NENHUM: 'nenhum refúgio' }
const ACRESCIMOS = [1, 2, 3]

type Mudanca = 'refugios' | 'agentes' | 'calor'

interface Props {
  /** Cenário A: a simulação que está na tela. */
  base: SimulacaoDetalhe
  enviando: boolean
  erro: string | null
  onSimular: (cenarioB: CenarioSimulacao) => void
}

/** O cenário A como foi rodado, pronto para virar a base do cenário B. */
function cenarioDe(s: SimulacaoDetalhe): CenarioSimulacao {
  return {
    nome: s.nome,
    modeloId: s.cenario.modeloId ?? undefined,
    icMaxPorDia: s.dias.map((d) => d.icMaxC),
    dataInicio: s.cenario.dataInicio ?? undefined,
    refugios: s.cenario.refugios,
    agentesPorUbs: s.cenario.agentesPorUbs,
    contatosPorAgenteDia: s.cenario.contatosPorAgenteDia,
    fatorK: s.cenario.fatorK,
    distrito: s.cenario.distrito ?? undefined,
  }
}

/**
 * "E se…?" (PBI 115): copia o cenário da tela, muda UMA coisa e roda o cenário B, que já abre comparado com o A.
 * Assim a comparação nunca junta dois cenários iguais e o gestor não precisa procurar simulações em listas.
 */
export function EseCenario({ base, enviando, erro, onSimular }: Props) {
  const c = base.cenario
  const [aberto, setAberto] = useState(false)
  const [mudanca, setMudanca] = useState<Mudanca>('refugios')
  const [refugios, setRefugios] = useState<ModoRefugios>(c.refugios === 'NENHUM' ? 'TODOS' : 'NENHUM')
  const [agentes, setAgentes] = useState(String(Math.min(c.agentesPorUbs + 1, 50)))
  const [acrescimo, setAcrescimo] = useState(1)

  const nAgentes = Number(agentes)
  const agentesValido = Number.isInteger(nAgentes) && nAgentes >= 1 && nAgentes <= 50 && nAgentes !== c.agentesPorUbs

  const descricao =
    mudanca === 'refugios'
      ? REFUGIOS[refugios]
      : mudanca === 'agentes'
        ? `${agentes} agente(s) por UBS`
        : `+${acrescimo} °C em todos os dias`
  const valido = mudanca === 'refugios' ? refugios !== c.refugios : mudanca === 'agentes' ? agentesValido : true

  const simular = () => {
    const a = cenarioDe(base)
    const b: CenarioSimulacao =
      mudanca === 'refugios'
        ? { ...a, refugios }
        : mudanca === 'agentes'
          ? { ...a, agentesPorUbs: nAgentes }
          : // mudar a temperatura deixa de ser o modelo pronto como veio
            { ...a, modeloId: undefined, icMaxPorDia: a.icMaxPorDia.map((ic) => Math.min(70, Math.round((ic + acrescimo) * 100) / 100)) }
    onSimular({ ...b, nome: `${base.nome} · ${descricao}` })
  }

  if (!aberto) {
    return (
      <section className="cartao ese">
        <div className="ese-chamada">
          <div>
            <h2>E se…?</h2>
            <p className="nota-campo">Mude uma coisa neste cenário e veja a diferença lado a lado.</p>
          </div>
          <button type="button" className="botao-primario" onClick={() => setAberto(true)}>
            Comparar com uma mudança
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="cartao ese" aria-labelledby="titulo-ese">
      <header className="cartao-cabecalho">
        <h2 id="titulo-ese">E se…? Mude uma coisa no cenário nº {base.id}</h2>
        <button type="button" className="botao-icone" onClick={() => setAberto(false)} aria-label="Fechar">
          ×
        </button>
      </header>
      <div className="ese-opcoes" role="radiogroup" aria-label="O que muda no cenário B">
        <label className={`ese-opcao${mudanca === 'refugios' ? ' ativa' : ''}`}>
          <input type="radio" name="ese" checked={mudanca === 'refugios'} onChange={() => setMudanca('refugios')} />
          <span className="ese-titulo">Refúgios</span>
          <span className="nota-campo">Hoje: {REFUGIOS[c.refugios]}</span>
          <select value={refugios} onChange={(e) => {
            setMudanca('refugios')
            setRefugios(e.target.value as ModoRefugios)
          }}>
            {(Object.keys(REFUGIOS) as ModoRefugios[])
              .filter((r) => r !== c.refugios)
              .map((r) => (
                <option key={r} value={r}>
                  {REFUGIOS[r]}
                </option>
              ))}
          </select>
        </label>
        <label className={`ese-opcao${mudanca === 'agentes' ? ' ativa' : ''}`}>
          <input type="radio" name="ese" checked={mudanca === 'agentes'} onChange={() => setMudanca('agentes')} />
          <span className="ese-titulo">Equipe</span>
          <span className="nota-campo">Hoje: {c.agentesPorUbs} agente(s) por UBS</span>
          <input
            inputMode="numeric"
            value={agentes}
            aria-label="Agentes por UBS no cenário B"
            aria-invalid={mudanca === 'agentes' && !agentesValido ? true : undefined}
            onChange={(e) => {
            setMudanca('agentes')
            setAgentes(e.target.value)
          }}
          />
        </label>
        <label className={`ese-opcao${mudanca === 'calor' ? ' ativa' : ''}`}>
          <input type="radio" name="ese" checked={mudanca === 'calor'} onChange={() => setMudanca('calor')} />
          <span className="ese-titulo">Calor</span>
          <span className="nota-campo">A mesma onda, mais quente</span>
          <select value={acrescimo} onChange={(e) => {
            setMudanca('calor')
            setAcrescimo(Number(e.target.value))
          }}>
            {ACRESCIMOS.map((a) => (
              <option key={a} value={a}>
                +{a} °C em todos os dias
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="ese-resumo">
        <strong>A</strong> = nº {base.id} como está · <strong>B</strong> = o mesmo cenário com <strong>{descricao}</strong>
      </p>
      {mudanca === 'agentes' && !agentesValido && (
        <p className="erro-campo">Informe de 1 a 50 agentes, diferente de {c.agentesPorUbs}.</p>
      )}
      {erro && (
        <p className="estado-erro" role="alert">
          O cenário B não rodou: {erro}
        </p>
      )}
      <button type="button" className="botao-primario" onClick={simular} disabled={!valido || enviando}>
        {enviando ? 'Simulando B…' : 'Simular B e comparar'}
      </button>
    </section>
  )
}
