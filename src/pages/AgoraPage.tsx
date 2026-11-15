import { useMemo, useState } from 'react'
import { AvisoServicos } from '../components/mapa/AvisoServicos'
import { EstadoMapa } from '../components/mapa/EstadoMapa'
import { MapaSetores } from '../components/mapa/MapaSetores'
import { ContatosPrioritarios } from '../components/painel/ContatosPrioritarios'
import { DetalheSetor } from '../components/painel/DetalheSetor'
import { Indicadores } from '../components/painel/Indicadores'
import type { EstadoDados } from '../hooks/useDados'
import type { EstadoGemeo, PessoaLista, Servico, SetoresGeoJson, SituacaoClima } from '../types'

interface Props {
  setores: EstadoDados<SetoresGeoJson>
  servicos: EstadoDados<Servico[]>
  clima: EstadoDados<SituacaoClima>
  estado: EstadoDados<EstadoGemeo>
  lista: EstadoDados<PessoaLista[]>
  seloMapa?: string
}

/** Aba “Agora”: o estado atual da cidade (camada sincronizada do gêmeo). */
export function AgoraPage({ setores, servicos, clima, estado, lista, seloMapa }: Props) {
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const destacados = useMemo(() => new Set(lista.dados?.map((p) => p.setorCodigo)), [lista.dados])
  const setorSel = setores.dados?.features.find((f) => f.id === selecionado)?.properties

  return (
    <div className="pagina-agora">
      <Indicadores clima={clima.dados} estado={estado.dados} />
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
            />
          )}
        </div>
        <div className="coluna-lateral">
          {setorSel && <DetalheSetor key={setorSel.codigo} setor={setorSel} onFechar={() => setSelecionado(null)} />}
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
