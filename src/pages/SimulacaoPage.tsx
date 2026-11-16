import { useMemo, useRef, useState } from 'react'
import { AvisoServicos } from '../components/mapa/AvisoServicos'
import { CAMADAS } from '../components/mapa/escalas'
import { EstadoMapa } from '../components/mapa/EstadoMapa'
import { MapaSetores } from '../components/mapa/MapaSetores'
import { camadasDaSimulacao } from '../components/simulacao/camadasSimulacao'
import { errosDaApi, formatar, type ErrosCenario } from '../components/simulacao/cenario'
import { DetalheSetorSimulado } from '../components/simulacao/DetalheSetorSimulado'
import { FormularioCenario } from '../components/simulacao/FormularioCenario'
import { ResultadoSimulacao } from '../components/simulacao/ResultadoSimulacao'
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

  const doDia = useMemo(() => new Map((setoresPorDia[dia] ?? []).map((s) => [s.codigoSetor, s])), [setoresPorDia, dia])
  const camadas = useMemo(() => (resultado ? { ...camadasDaSimulacao(doDia), ...CAMADAS } : CAMADAS), [resultado, doDia])
  const diaAtual = resultado?.dias.find((d) => d.dia === dia)

  const simular = async (cenario: CenarioSimulacao) => {
    setEnviando(true)
    setErroEnvio(null)
    setErrosApi({})
    try {
      const criada = await api.criarSimulacao(cenario)
      const detalhe = await api.simulacao(criada.id, 1)
      setResultado(detalhe)
      setDia(1)
      setSetoresPorDia({ 1: detalhe.setores })
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
          <FormularioCenario modelos={modelos} distritos={distritos} enviando={enviando} errosApi={errosApi} onSimular={simular} />
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
              key={resultado ? `sim-${resultado.id}` : 'territorio'}
              setores={setores.dados.features}
              servicos={servicos.dados ?? []}
              selecionado={selecionado}
              onSelecionar={setSelecionado}
              selo={resultado ? `Simulação nº ${resultado.id} · dia ${dia}` : 'Simulação · cenário hipotético'}
              camadas={camadas}
              camadaInicial={resultado ? 'semContato' : 'calor'}
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
    </div>
  )
}
