import { useCallback, useMemo, useRef, useState } from 'react'
import { AvisoServicos } from '../components/mapa/AvisoServicos'
import { CAMADAS } from '../components/mapa/escalas'
import { EstadoMapa } from '../components/mapa/EstadoMapa'
import { MapaSetores } from '../components/mapa/MapaSetores'
import { camadasDaSimulacao } from '../components/simulacao/camadasSimulacao'
import { ComparacaoCenarios } from '../components/simulacao/ComparacaoCenarios'
import { EseCenario } from '../components/simulacao/EseCenario'
import { camadasComparacao } from '../components/simulacao/comparacao'
import { errosDaApi, formatar, type ErrosCenario } from '../components/simulacao/cenario'
import { DetalheSetorSimulado } from '../components/simulacao/DetalheSetorSimulado'
import { FormularioCenario } from '../components/simulacao/FormularioCenario'
import { piorDia, ResultadoSimulacao } from '../components/simulacao/ResultadoSimulacao'
import { useDados, type EstadoDados } from '../hooks/useDados'
import { ApiError, api } from '../services'
import type { CenarioSimulacao, Servico, SetoresGeoJson, SetorSimulado, SimulacaoDetalhe } from '../types'

interface Props {
  setores: EstadoDados<SetoresGeoJson>
  servicos: EstadoDados<Servico[]>
}

/**
 * Aba “Simulação”: o gestor monta um cenário (onda de calor, refúgios, agentes), roda no motor da
 * base territorial e vê o resultado no mapa (dia a dia) e na linha do tempo. Nada disso altera os dados reais.
 */
export function SimulacaoPage({ setores, servicos }: Props) {
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const modelos = useDados(api.modelosOndaCalor)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [errosApi, setErrosApi] = useState<ErrosCenario>({})
  const [resultado, setResultado] = useState<SimulacaoDetalhe | null>(null)
  const resultadoRef = useRef<HTMLDivElement>(null)

  // resultado por setor, um dia de cada vez (GET /simulacoes/{id}?dia=N), guardado conforme é visto
  const [dia, setDia] = useState(1)
  const [setoresPorDia, setSetoresPorDia] = useState<Record<number, SetorSimulado[]>>({})
  const [carregandoDia, setCarregandoDia] = useState(false)
  const [erroDia, setErroDia] = useState<string | null>(null)

  const distritos = useMemo(
    () => [...new Set(setores.dados?.features.map((f) => f.properties.distrito).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [setores.dados],
  )

  // comparação A × B (PBI 115): pinta o mapa com a diferença por setor no dia escolhido
  const [comparacao, setComparacao] = useState<{ a: SimulacaoDetalhe; b: SimulacaoDetalhe; dia: number } | null>(null)
  // "E se…?": roda o cenário B e pede a comparação com o resultado na tela
  const [pedidoComparacao, setPedidoComparacao] = useState<{ a: number; b: number; chave: number } | null>(null)
  const [enviandoB, setEnviandoB] = useState(false)
  const [erroB, setErroB] = useState<string | null>(null)
  const simularVariante = async (cenarioB: CenarioSimulacao) => {
    if (!resultado) return
    setEnviandoB(true)
    setErroB(null)
    try {
      const criada = await api.criarSimulacao(cenarioB)
      setPedidoComparacao({ a: resultado.id, b: criada.id, chave: Date.now() })
    } catch (e) {
      setErroB(e instanceof Error ? e.message : 'Não foi possível rodar o cenário B')
    } finally {
      setEnviandoB(false)
    }
  }
  const aoComparar = useCallback((c: { a: SimulacaoDetalhe; b: SimulacaoDetalhe; dia: number } | null) => setComparacao(c), [])

  const doDia = useMemo(() => new Map((setoresPorDia[dia] ?? []).map((s) => [s.codigoSetor, s])), [setoresPorDia, dia])
  const camadas = useMemo(
    () => ({
      ...(comparacao ? camadasComparacao(comparacao.a, comparacao.b, comparacao.dia) : {}),
      ...(resultado ? camadasDaSimulacao(doDia) : {}),
      ...CAMADAS,
    }),
    [resultado, doDia, comparacao],
  )
  const chaveComparacao = comparacao ? `cmp-${comparacao.a.id}-${comparacao.b.id}` : null
  const diaAtual = resultado?.dias.find((d) => d.dia === dia)

  const simular = async (cenario: CenarioSimulacao) => {
    setEnviando(true)
    setErroEnvio(null)
    setErrosApi({})
    try {
      const criada = await api.criarSimulacao(cenario)
      const detalhe = await api.simulacao(criada.id, 1)
      // o mapa abre no pior dia (mais pessoas sem contato), não no dia 1, que costuma estar vazio
      const pior = piorDia(detalhe.dias)?.dia ?? 1
      const setoresDoPior = pior === 1 ? detalhe.setores : (await api.simulacao(criada.id, pior)).setores
      setResultado(detalhe)
      setDia(pior)
      const vistos: Record<number, SetorSimulado[]> = { 1: detalhe.setores }
      vistos[pior] = setoresDoPior
      setSetoresPorDia(vistos)
      setErroDia(null)
      requestAnimationFrame(() => {
        resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        resultadoRef.current?.querySelector<HTMLElement>('.resultado-simulacao')?.focus({ preventScroll: true })
      })
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) setErrosApi(errosDaApi(e.detalhes))
      setErroEnvio(e instanceof Error ? e.message : 'Não foi possível rodar a simulação')
    } finally {
      setEnviando(false)
    }
  }

  const verDia = async (novo: number) => {
    if (!resultado) return
    setDia(novo)
    setErroDia(null)
    if (setoresPorDia[novo]) return
    setCarregandoDia(true)
    try {
      const detalhe = await api.simulacao(resultado.id, novo)
      setSetoresPorDia((atual) => ({ ...atual, [novo]: detalhe.setores }))
    } catch (e) {
      setErroDia(e instanceof Error ? e.message : 'Erro ao carregar o dia')
    } finally {
      setCarregandoDia(false)
    }
  }

  const linhasDica = resultado
    ? (p: { codigo: string }) => {
        const s = doDia.get(p.codigo)
        return s ? [`Dia ${dia}: ${s.pessoasNaLista} na lista, ${s.pendentes} sem contato`, `Sem refúgio a até 800 m: ${s.semRefugio800m}`] : []
      }
    : undefined
  const setorSel = setores.dados?.features.find((f) => f.id === selecionado)?.properties

  return (
    <div className="pagina-simulacao">
      <p className="faixa-simulacao" role="note">
        Modo simulação: cenários hipotéticos rodam sobre uma cópia da cidade e não alteram os dados reais.
      </p>
      <div className="grade-simulacao">
        <section className="cartao painel-cenario" aria-labelledby="titulo-cenario">
          <header className="cartao-cabecalho">
            <h2 id="titulo-cenario">Cenário</h2>
          </header>
          <FormularioCenario
            modelos={modelos}
            distritos={distritos}
            enviando={enviando}
            errosApi={errosApi}
            onSimular={simular}
            totalUbs={servicos.dados?.filter((s) => s.tipo === 'UBS').length || undefined}
          />
          {erroEnvio && (
            <p className="nota estado-erro" role="alert">
              A simulação não foi enviada: {erroEnvio}
            </p>
          )}
        </section>
        <div className="cartao cartao-mapa">
          <EstadoMapa carregando={setores.carregando} erro={setores.erro} onTentarDeNovo={setores.recarregar} />
          {setores.dados && !setores.carregando && (
            <AvisoServicos erro={servicos.erro} carregando={servicos.carregando} onTentarDeNovo={servicos.recarregar} />
          )}
          {resultado && setores.dados && !setores.carregando && (
            <div className="seletor-dia" role="group" aria-label="Dia mostrado no mapa">
              <button type="button" className="botao-icone" onClick={() => verDia(dia - 1)} disabled={dia <= 1} aria-label="Dia anterior">
                ‹
              </button>
              <label>
                <span className="sr-only">Dia</span>
                <select value={dia} onChange={(e) => verDia(Number(e.target.value))}>
                  {resultado.dias.map((d) => (
                    <option key={d.dia} value={d.dia}>
                      Dia {d.dia} · NC{d.nivel} · {formatar(d.icMaxC)} °C
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="botao-icone"
                onClick={() => verDia(dia + 1)}
                disabled={dia >= resultado.dias.length}
                aria-label="Próximo dia"
              >
                ›
              </button>
              <span className="seletor-dia-status" aria-live="polite">
                {carregandoDia ? 'carregando…' : erroDia ? `erro: ${erroDia}` : diaAtual ? `${diaAtual.pendentes ?? 0} sem contato` : ''}
              </span>
            </div>
          )}
          {setores.dados && !setores.carregando && (
            <MapaSetores
              key={chaveComparacao ?? (resultado ? `sim-${resultado.id}` : 'territorio')}
              setores={setores.dados.features}
              servicos={servicos.dados ?? []}
              selecionado={selecionado}
              onSelecionar={setSelecionado}
              selo={
                comparacao
                  ? `A nº ${comparacao.a.id} × B nº ${comparacao.b.id} · dia ${comparacao.dia}`
                  : resultado
                    ? `Simulação nº ${resultado.id} · dia ${dia}`
                    : 'Simulação · cenário hipotético'
              }
              camadas={camadas}
              camadaInicial={comparacao ? 'difSemContato' : resultado ? 'semContato' : 'calor'}
              linhasDica={linhasDica}
            />
          )}
          {resultado && setorSel && (
            <DetalheSetorSimulado
              setor={setorSel}
              dia={dia}
              dados={doDia.get(setorSel.codigo)}
              carregando={carregandoDia && !setoresPorDia[dia]}
              onFechar={() => setSelecionado(null)}
            />
          )}
        </div>
      </div>
      <div ref={resultadoRef}>{resultado && <ResultadoSimulacao simulacao={resultado} diaSelecionado={dia} onDia={verDia} />}</div>
      {resultado && <EseCenario key={resultado.id} base={resultado} enviando={enviandoB} erro={erroB} onSimular={simularVariante} />}
      {setores.dados && (
        <ComparacaoCenarios
          setores={setores.dados.features}
          simulacaoAtual={resultado?.id ?? null}
          onComparacao={aoComparar}
          pedido={pedidoComparacao}
        />
      )}
    </div>
  )
}
