import { useCallback, useMemo, useState } from 'react'
import { AvisoServicos } from '../components/mapa/AvisoServicos'
import { EstadoMapa } from '../components/mapa/EstadoMapa'
import { CAMADAS } from '../components/mapa/escalas'
import { MapaSetores } from '../components/mapa/MapaSetores'
import { camadaCobertura, coberturaPorSetor, porcentagem } from '../components/painel/coberturaMapa'
import { CoberturaPorUbs } from '../components/painel/CoberturaPorUbs'
import { ContatosPrioritarios } from '../components/painel/ContatosPrioritarios'
import { DetalheSetor } from '../components/painel/DetalheSetor'
import { Indicadores } from '../components/painel/Indicadores'
import type { EstadoDados } from '../hooks/useDados'
import type { Cobertura, PessoaLista, Servico, SetoresGeoJson, SetorProps, SituacaoClima } from '../types'

interface Props {
  setores: EstadoDados<SetoresGeoJson>
  servicos: EstadoDados<Servico[]>
  clima: EstadoDados<SituacaoClima>
  cobertura: EstadoDados<Cobertura | null>
  lista: EstadoDados<PessoaLista[]>
  seloMapa?: string
}

/** Aba “Agora”: o estado atual da cidade (camada sincronizada do gêmeo). */
export function AgoraPage({ setores, servicos, clima, cobertura, lista, seloMapa }: Props) {
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const destacados = useMemo(() => new Set(lista.dados?.map((p) => p.setorCodigo)), [lista.dados])
  const setorSel = setores.dados?.features.find((f) => f.id === selecionado)?.properties

  // Cobertura da busca ativa por setor: camada do mapa, dica e detalhe do setor
  const porSetor = useMemo(() => coberturaPorSetor(cobertura.dados), [cobertura.dados])
  const camadas = useMemo(
    () => (cobertura.dados ? { ...CAMADAS, cobertura: camadaCobertura(porSetor) } : CAMADAS),
    [cobertura.dados, porSetor],
  )
  const linhasDica = useCallback(
    (p: SetorProps) => {
      const c = porSetor.get(p.codigo)
      return c ? [`Busca ativa: ${c.resumo.contatados} de ${c.resumo.total} contatadas (${porcentagem(c.resumo.coberturaPercentual)})`] : []
    },
    [porSetor],
  )
  const nota5 = setores.dados?.features.filter((f) => f.properties.classeCalor === 5).length ?? null

  return (
    <div className="pagina-agora">
      <Indicadores
        clima={clima.dados}
        cobertura={cobertura.dados}
        coberturaCarregada={!cobertura.carregando && !cobertura.erro}
        setoresNota5={nota5}
        totalSetores={setores.dados?.features.length ?? null}
      />
      {clima.dados && (
        <p className="faixa-acao">
          <strong>Ação do nível:</strong> {clima.dados.acaoEsperada} <span>Critério: {clima.dados.criterio}.</span>
        </p>
      )}
      <div className="grade-agora">
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
              destacados={destacados}
              selo={seloMapa}
              camadas={camadas}
              linhasDica={linhasDica}
            />
          )}
        </div>
        <div className="coluna-lateral">
          {setorSel && (
            <DetalheSetor
              key={setorSel.codigo}
              setor={setorSel}
              onFechar={() => setSelecionado(null)}
              cobertura={porSetor.get(setorSel.codigo)}
              haBuscaAtiva={Boolean(cobertura.dados)}
            />
          )}
          <CoberturaPorUbs
            cobertura={cobertura.dados}
            carregando={cobertura.carregando}
            erro={cobertura.erro}
            onTentarDeNovo={cobertura.recarregar}
          />
          <ContatosPrioritarios
            pessoas={lista.dados}
            carregando={lista.carregando}
            erro={lista.erro}
            setorSelecionado={selecionado}
            onSelecionarSetor={setSelecionado}
          />
        </div>
      </div>
    </div>
  )
}
