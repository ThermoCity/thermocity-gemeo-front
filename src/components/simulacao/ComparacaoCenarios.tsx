import { useEffect, useMemo, useRef, useState } from 'react'
import { useDados } from '../../hooks/useDados'
import { api } from '../../services'
import type { SetorFeature, SimulacaoDetalhe, SimulacaoResumo } from '../../types'
import { SeloNivel } from '../painel/Indicadores'
import { formatar } from './cenario'
import {
  avisosComparacao,
  comSinal,
  compararPorDia,
  compararPorRegiao,
  compararPorSetor,
  diferenca,
  motivoIncomparavel,
  type Par,
} from './comparacao'

const REFUGIOS = { TODOS: 'todos os refúgios', PUBLICOS: 'só públicos', NENHUM: 'nenhum refúgio' } as const
const MAX_SETORES = 10

interface Props {
  setores: SetorFeature[]
  /** Simulação que acabou de rodar: entra como B, e a anterior como A. */
  simulacaoAtual: number | null
  /** Avisa a página para pintar o mapa com a diferença do dia (ou limpar, com null). */
  onComparacao: (comparacao: { a: SimulacaoDetalhe; b: SimulacaoDetalhe; dia: number } | null) => void
}

const rotulo = (s: SimulacaoResumo) =>
  `nº ${s.id} · ${s.nome} · ${s.qtdDias} dias${s.refugios ? ` · ${REFUGIOS[s.refugios]}` : ''}${s.agentesPorUbs ? ` · ${s.agentesPorUbs} agente(s)/UBS` : ''}`

/** Diferença com a cor de quem ficou melhor: menos pessoas em B = melhor (azul), mais = pior (laranja). */
function Diferenca({ par }: { par: Par }) {
  const d = diferenca(par)
  return <span className={d > 0 ? 'dif-pior' : d < 0 ? 'dif-melhor' : 'dif-igual'}>{comSinal(d)}</span>
}

function Celulas({ par }: { par: Par }) {
  return (
    <>
      <td>{par.a.toLocaleString('pt-BR')}</td>
      <td>{par.b.toLocaleString('pt-BR')}</td>
      <td>
        <Diferenca par={par} />
      </td>
    </>
  )
}

function Cabecalho({ primeira }: { primeira: string }) {
  return (
    <thead>
      <tr>
        <th rowSpan={2}>{primeira}</th>
        <th colSpan={3} scope="colgroup">Idosos sem refúgio a até 800 m</th>
        <th colSpan={3} scope="colgroup">Pessoas sem contato</th>
      </tr>
      <tr>
        <th>A</th>
        <th>B</th>
        <th>B − A</th>
        <th>A</th>
        <th>B</th>
        <th>B − A</th>
      </tr>
    </thead>
  )
}

/** PBI 115: compara duas simulações (ex.: com e sem refúgios) por dia, por região e por setor. */
export function ComparacaoCenarios({ setores, simulacaoAtual, onComparacao }: Props) {
  const lista = useDados(api.listarSimulacoes)
  const concluidas = useMemo(() => (lista.dados ?? []).filter((s) => s.status === 'CONCLUIDA'), [lista.dados])
  const [idA, setIdA] = useState<number | ''>('')
  const [idB, setIdB] = useState<number | ''>('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [par, setPar] = useState<{ a: SimulacaoDetalhe; b: SimulacaoDetalhe } | null>(null)
  const [dia, setDia] = useState(1)

  // Uma simulação nova entra na lista e vira o cenário B
  const { recarregar } = lista
  useEffect(() => {
    if (simulacaoAtual != null) recarregar()
  }, [simulacaoAtual, recarregar])

  // Sugestão: B = a que acabou de rodar (ou a mais recente), A = a anterior com o mesmo número de dias.
  // Refeita a cada simulação nova; depois o gestor troca à vontade.
  const sugeridaPara = useRef<number | null | undefined>(undefined)
  useEffect(() => {
    if (concluidas.length < 2) return
    const alvo = concluidas.some((s) => s.id === simulacaoAtual) ? simulacaoAtual : null
    if (sugeridaPara.current !== undefined && sugeridaPara.current === alvo) return
    sugeridaPara.current = alvo
    const b = concluidas.find((s) => s.id === alvo) ?? concluidas[0]
    const a = concluidas.find((s) => s.id !== b.id && s.qtdDias === b.qtdDias) ?? concluidas.find((s) => s.id !== b.id)
    setIdB(b.id)
    if (a) setIdA(a.id)
  }, [concluidas, simulacaoAtual])

  useEffect(() => {
    onComparacao(par ? { ...par, dia } : null)
  }, [par, dia, onComparacao])

  const comparar = async () => {
    if (idA === '' || idB === '') return
    setCarregando(true)
    setErro(null)
    setMotivo(null)
    setPar(null)
    try {
      const [a, b] = await Promise.all([api.simulacao(idA), api.simulacao(idB)])
      const impedimento = motivoIncomparavel(a, b)
      if (impedimento) {
        setMotivo(impedimento)
        return
      }
      setPar({ a, b })
      // Abre no dia de maior diferença de pessoas sem contato
      const porDia = compararPorDia(a, b)
      const pior = porDia.reduce((m, l) => (Math.abs(diferenca(l.semContato)) > Math.abs(diferenca(m.semContato)) ? l : m), porDia[0])
      setDia(pior?.dia ?? 1)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as simulações')
    } finally {
      setCarregando(false)
    }
  }

  const porDia = useMemo(() => (par ? compararPorDia(par.a, par.b) : []), [par])
  const porRegiao = useMemo(() => (par ? compararPorRegiao(par.a, par.b, dia, setores) : []), [par, dia, setores])
  const porSetor = useMemo(() => (par ? compararPorSetor(par.a, par.b, dia, setores) : []), [par, dia, setores])
  const avisos = useMemo(() => (par ? avisosComparacao(par.a, par.b) : []), [par])
  const total = (campo: 'semRefugio' | 'semContato'): Par => ({
    a: porDia.reduce((t, l) => t + l[campo].a, 0),
    b: porDia.reduce((t, l) => t + l[campo].b, 0),
  })
  const pico = (campo: 'semRefugio' | 'semContato'): Par => ({
    a: Math.max(0, ...porDia.map((l) => l[campo].a)),
    b: Math.max(0, ...porDia.map((l) => l[campo].b)),
  })

  return (
    <section className="cartao comparacao" aria-labelledby="titulo-comparacao">
      <header className="cartao-cabecalho">
        <h2 id="titulo-comparacao">Comparar cenários (A × B)</h2>
      </header>
      <p className="nota">
        Escolha duas simulações com o mesmo número de dias, por exemplo a mesma onda de calor com e sem refúgios. B − A negativo (azul) quer dizer
        que B deixa menos pessoas desassistidas.
      </p>

      {lista.carregando && <p className="estado-vazio">Carregando simulações…</p>}
      {lista.erro && (
        <p className="estado-erro">
          {lista.erro}{' '}
          <button type="button" className="botao-link" onClick={lista.recarregar}>
            Tentar de novo
          </button>
        </p>
      )}
      {!lista.carregando && !lista.erro && concluidas.length < 2 && (
        <p className="estado-vazio">Rode pelo menos duas simulações para comparar.</p>
      )}

      {concluidas.length >= 2 && (
        <div className="comparacao-escolha">
          <label className="campo-inline">
            <span>Cenário A</span>
            <select value={idA} onChange={(e) => setIdA(Number(e.target.value))}>
              <option value="" disabled>
                escolha…
              </option>
              {concluidas.map((s) => (
                <option key={s.id} value={s.id}>
                  {rotulo(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="campo-inline">
            <span>Cenário B</span>
            <select value={idB} onChange={(e) => setIdB(Number(e.target.value))}>
              <option value="" disabled>
                escolha…
              </option>
              {concluidas.map((s) => (
                <option key={s.id} value={s.id}>
                  {rotulo(s)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="botao-primario" onClick={comparar} disabled={idA === '' || idB === '' || carregando}>
            {carregando ? 'Comparando…' : 'Comparar'}
          </button>
          {par && (
            <button type="button" className="botao-link" onClick={() => setPar(null)}>
              Limpar comparação
            </button>
          )}
        </div>
      )}

      {motivo && (
        <p className="aviso-extrapolacao" role="alert">
          {motivo}
        </p>
      )}
      {erro && (
        <p className="estado-erro" role="alert">
          {erro}
        </p>
      )}

      {par && (
        <>
          {avisos.map((a) => (
            <p key={a} className="aviso-extrapolacao">
              {a}
            </p>
          ))}

          <div className="comparacao-lados">
            {(['a', 'b'] as const).map((lado) => {
              const s = par[lado]
              const c = s.cenario
              return (
                <div key={lado} className="comparacao-lado">
                  <strong>
                    {lado.toUpperCase()} · nº {s.id} · {s.nome}
                  </strong>
                  <span className="nota-campo">
                    {REFUGIOS[c.refugios]} · {c.agentesPorUbs} agente(s)/UBS × {c.contatosPorAgenteDia} contatos/dia · k = {formatar(c.fatorK, 2)}
                    {c.distrito ? ` · ${c.distrito}` : ''}
                  </span>
                  <SeloNivel nivel={s.nivelMaximo} nome="máximo" />
                </div>
              )
            })}
          </div>

          <div className="tabela-rolagem">
            <table className="tabela-resultado tabela-comparacao">
              <caption className="sr-only">Indicadores dos dois cenários somando todos os dias</caption>
              <Cabecalho primeira="Indicador" />
              <tbody>
                <tr>
                  <th scope="row">Pico em um dia</th>
                  <Celulas par={pico('semRefugio')} />
                  <Celulas par={pico('semContato')} />
                </tr>
                <tr>
                  <th scope="row">Soma dos dias (pessoas-dia)</th>
                  <Celulas par={total('semRefugio')} />
                  <Celulas par={total('semContato')} />
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="comparacao-subtitulo">Por dia</h3>
          <div className="tabela-rolagem">
            <table className="tabela-resultado tabela-comparacao">
              <Cabecalho primeira="Dia" />
              <tbody>
                {porDia.map((l) => (
                  <tr key={l.dia} className={l.dia === dia ? 'linha-ativa' : undefined}>
                    <th scope="row">
                      <button type="button" className="botao-link" onClick={() => setDia(l.dia)} aria-label={`Ver o dia ${l.dia} por região e no mapa`}>
                        Dia {l.dia}
                      </button>{' '}
                      <small>
                        NC{l.nivelA}
                        {l.nivelB !== l.nivelA && ` / NC${l.nivelB}`}
                      </small>
                    </th>
                    <Celulas par={l.semRefugio} />
                    <Celulas par={l.semContato} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="comparacao-subtitulo">
            Por região no dia{' '}
            <select value={dia} onChange={(e) => setDia(Number(e.target.value))} aria-label="Dia da comparação por região">
              {porDia.map((l) => (
                <option key={l.dia} value={l.dia}>
                  {l.dia}
                </option>
              ))}
            </select>
          </h3>
          <div className="tabela-rolagem">
            <table className="tabela-resultado tabela-comparacao">
              <Cabecalho primeira="Distrito" />
              <tbody>
                {porRegiao.map((l) => (
                  <tr key={l.regiao}>
                    <th scope="row">{l.regiao}</th>
                    <Celulas par={l.semRefugio} />
                    <Celulas par={l.semContato} />
                  </tr>
                ))}
                {porRegiao.length === 0 && (
                  <tr>
                    <td colSpan={7}>Ninguém na lista neste dia nos dois cenários.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {porSetor.length > 0 && (
            <>
              <h3 className="comparacao-subtitulo">Setores que mais mudam no dia {dia}</h3>
              <div className="tabela-rolagem">
                <table className="tabela-resultado tabela-comparacao">
                  <Cabecalho primeira="Setor" />
                  <tbody>
                    {porSetor.slice(0, MAX_SETORES).map((l) => (
                      <tr key={l.codigo}>
                        <th scope="row">
                          {l.codigo.slice(-4)} <small>{l.regiao}</small>
                        </th>
                        <Celulas par={l.semRefugio} />
                        <Celulas par={l.semContato} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="nota">
                {porSetor.length > MAX_SETORES ? `Os ${MAX_SETORES} de ${porSetor.length} setores com diferença. ` : ''}O mapa ganhou as camadas
                “A × B” com a diferença de cada setor neste dia.
              </p>
            </>
          )}
        </>
      )}
    </section>
  )
}
