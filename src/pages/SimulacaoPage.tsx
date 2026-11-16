import { useMemo, useRef, useState } from 'react'
import { AvisoServicos } from '../components/mapa/AvisoServicos'
import { EstadoMapa } from '../components/mapa/EstadoMapa'
import { MapaSetores } from '../components/mapa/MapaSetores'
import { errosDaApi, type ErrosCenario } from '../components/simulacao/cenario'
import { FormularioCenario } from '../components/simulacao/FormularioCenario'
import { ResultadoSimulacao } from '../components/simulacao/ResultadoSimulacao'
import { useDados, type EstadoDados } from '../hooks/useDados'
import { ApiError, api } from '../services'
import type { CenarioSimulacao, Servico, SetoresGeoJson, SimulacaoDetalhe } from '../types'

interface Props {
  setores: EstadoDados<SetoresGeoJson>
  servicos: EstadoDados<Servico[]>
}

/**
 * Aba “Simulação”: o gestor monta um cenário (onda de calor, refúgios, agentes), roda no motor da
 * base territorial e vê o resultado dia a dia. Nada disso altera os dados reais.
 */
export function SimulacaoPage({ setores, servicos }: Props) {
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const modelos = useDados(api.modelosOndaCalor)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [errosApi, setErrosApi] = useState<ErrosCenario>({})
  const [resultado, setResultado] = useState<SimulacaoDetalhe | null>(null)
  const resultadoRef = useRef<HTMLDivElement>(null)

  const distritos = useMemo(
    () => [...new Set(setores.dados?.features.map((f) => f.properties.distrito).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [setores.dados],
  )

  const simular = async (cenario: CenarioSimulacao) => {
    setEnviando(true)
    setErroEnvio(null)
    setErrosApi({})
    try {
      const criada = await api.criarSimulacao(cenario)
      // o resultado traz os setores só do dia 1 (o mapa por dia busca os outros)
      setResultado(await api.simulacao(criada.id, 1))
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
          {setores.dados && !setores.carregando && (
            <MapaSetores
              setores={setores.dados.features}
              servicos={servicos.dados ?? []}
              selecionado={selecionado}
              onSelecionar={setSelecionado}
              selo="Simulação · cenário hipotético"
            />
          )}
        </div>
      </div>
      <div ref={resultadoRef}>{resultado && <ResultadoSimulacao simulacao={resultado} />}</div>
    </div>
  )
}
