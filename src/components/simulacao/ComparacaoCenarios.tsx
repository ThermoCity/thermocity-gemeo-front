import { useEffect, useMemo, useRef, useState } from 'react'
import { useDados } from '../../hooks/useDados'
import { api } from '../../services'
import type { SetorFeature, SimulacaoDetalhe, SimulacaoResumo } from '../../types'
import {
  avisosComparacao,
  comSinal,
  compararPorDia,
  compararPorRegiao,
  compararPorSetor,
  diferenca,
  diferencasCenario,
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
  /** Pedido vindo do "E se…?": compara essas duas simulações assim que chega (chave muda a cada pedido). */
  pedido?: { a: number; b: number; chave: number } | null
}

const hora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''

const rotulo = (s: SimulacaoResumo) =>
  `nº ${s.id} · ${s.nome} · ${s.qtdDias} dias${s.refugios ? ` · ${REFUGIOS[s.refugios]}` : ''}${s.agentesPorUbs ? ` · ${s.agentesPorUbs} agente(s)/UBS` : ''}${s.criadoEm ? ` · ${hora(s.criadoEm)}` : ''}`

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

/** Cartão com A, B e a diferença B − A em destaque. */
function CartaoDiferenca({ rotulo, par, nota }: { rotulo: string; par: Par; nota?: string }) {
  return (
    <div className="kpi">
      <span className="kpi-rotulo">{rotulo}</span>
      <strong className="kpi-valor">
        <Diferenca par={par} />
      </strong>
      <span className="kpi-nota">
        A {par.a.toLocaleString('pt-BR')} → B {par.b.toLocaleString('pt-BR')}
        {nota ? ` ${nota}` : ''}
      </span>
    </div>
  )
}

/** Uma frase com a resposta: quantas pessoas a mais ou a menos B deixa sem contato e longe de refúgio no pior dia. */
function conclusao(semContato: Par, semRefugio: Par): string {
  const parte = (d: number, quem: string, situacao: string) =>
    d === 0
      ? `o mesmo número de ${quem} ${situacao}`
      : `${Math.abs(d).toLocaleString('pt-BR')} ${quem} ${d > 0 ? 'a mais' : 'a menos'} ${situacao}`
  return `No pior dia, B deixa ${parte(diferenca(semContato), 'pessoas', 'sem contato')} e ${parte(diferenca(semRefugio), 'idosos', 'longe de um refúgio')} do que A.`
}

/** PBI 115: compara duas simulações (ex.: com e sem refúgios) por dia, por região e por setor. */
export function ComparacaoCenarios({ setores, simulacaoAtual, onComparacao, pedido }: Props) {
  const secaoRef = useRef<HTMLElement>(null)
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

  // "E se…?": a simulação B acabou de rodar; entra na lista e a comparação abre sozinha
  const chavePedido = pedido?.chave
  useEffect(() => {
    if (!pedido) return
    recarregar()
    setIdA(pedido.a)
    setIdB(pedido.b)
    sugeridaPara.current = simulacaoAtual
    compararIds(pedido.a, pedido.b, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chavePedido])

  const comparar = () => {
    if (idA !== '' && idB !== '') compararIds(idA, idB)
  }

  const compararIds = async (idA: number, idB: number, rolar = false) => {
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
      if (rolar) requestAnimationFrame(() => secaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
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
    <section ref={secaoRef} className="cartao comparacao" aria-labelledby="titulo-comparacao">
      <header className="cartao-cabecalho">
        <h2 id="titulo-comparacao">Comparar cenários (A × B)</h2>
      </header>
      <p className="nota">
        O jeito mais rápido é o botão “E se…?” do resultado. Aqui dá para escolher quaisquer duas simulações com o mesmo número de dias. B − A
        negativo (azul) quer dizer que B deixa menos pessoas desassistidas.
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
          <div className="comparacao-muda">
            <strong>O que muda de A para B:</strong>
            <ul>
              {diferencasCenario(par.a, par.b).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <span className="nota-campo">
              A = nº {par.a.id} · {par.a.nome} &nbsp;|&nbsp; B = nº {par.b.id} · {par.b.nome}
            </span>
          </div>

          {avisos.map((a) => (
            <p key={a} className="aviso-extrapolacao">
              {a}
            </p>
          ))}

          <p className="resultado-manchete">{conclusao(pico('semContato'), pico('semRefugio'))}</p>

          <div className="resultado-kpis">
            <CartaoDiferenca rotulo="Sem contato no pior dia" par={pico('semContato')} />
            <CartaoDiferenca rotulo="Idosos longe de um refúgio no pior dia" par={pico('semRefugio')} />
            <CartaoDiferenca rotulo="Pessoas sem contato somando os dias" par={total('semContato')} nota="pessoas-dia" />
          </div>

          <div className="comparacao-dia">
            <label className="campo-inline">
              <span>Dia no mapa e nos detalhes</span>
              <select value={dia} onChange={(e) => setDia(Number(e.target.value))}>
                {porDia.map((l) => (
                  <option key={l.dia} value={l.dia}>
                    Dia {l.dia} · NC{l.nivelA}
                    {l.nivelB !== l.nivelA ? ` / NC${l.nivelB}` : ''} · B − A sem contato: {comSinal(diferenca(l.semContato))}
                  </option>
                ))}
              </select>
            </label>
            <span className="nota-campo">O mapa ganhou as camadas “A × B” com a diferença de cada setor neste dia.</span>
          </div>

          <details className="detalhes">
            <summary>Detalhes: por dia, por distrito e por setor</summary>

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

            <h3 className="comparacao-subtitulo">Por distrito no dia {dia}</h3>
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
                {porSetor.length > MAX_SETORES && (
                  <p className="nota">
                    Os {MAX_SETORES} de {porSetor.length} setores com diferença.
                  </p>
                )}
              </>
            )}
          </details>
        </>
      )}
    </section>
  )
}
