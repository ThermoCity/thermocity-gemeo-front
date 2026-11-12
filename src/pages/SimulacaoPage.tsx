import { useState } from 'react'
import { MapaSetores } from '../components/mapa/MapaSetores'
import type { EstadoDados } from '../hooks/useDados'
import type { Servico, SetoresGeoJson } from '../types'

interface Props {
  setores: EstadoDados<SetoresGeoJson>
  servicos: EstadoDados<Servico[]>
}

/**
 * Aba “Simulação”: estrutura da tela. Os controles e o resultado chegam nos PBIs
 * “Montar o cenário de simulação no painel”, “Exibir o resultado da simulação”
 * e “Comparar dois cenários lado a lado (A × B)”.
 */
export function SimulacaoPage({ setores, servicos }: Props) {
  const [selecionado, setSelecionado] = useState<string | null>(null)
  return (
    <div className="pagina-simulacao">
      <p className="faixa-simulacao" role="note">
        Modo simulação: cenários hipotéticos rodam sobre uma cópia da cidade e não alteram os dados reais.
      </p>
      <div className="grade-simulacao">
        <section className="cartao painel-cenario" aria-labelledby="titulo-cenario">
          <header className="cartao-cabecalho">
            <h2 id="titulo-cenario">Cenário</h2>
            <span className="etiqueta-breve">Em construção</span>
          </header>
          <fieldset disabled className="cenario-campos">
            <label>
              Onda de calor
              <select defaultValue="2023">
                <option value="2023">Episódio real de 2023</option>
                <option value="2023+3">2023 + 3 °C</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </label>
            <label>
              Refúgios considerados
              <select defaultValue="todos">
                <option value="todos">Todos</option>
                <option value="publicos">Só os públicos</option>
                <option value="nenhum">Nenhum</option>
              </select>
            </label>
            <label>
              Agentes por UBS
              <input type="number" defaultValue={2} min={1} />
            </label>
            <label>
              Contatos por agente por dia
              <input type="number" defaultValue={15} min={1} />
            </label>
            <button type="button" className="botao-primario">Simular</button>
          </fieldset>
          <p className="nota">Os controles serão ligados ao motor de simulação da API Java (POST /simulacoes).</p>
        </section>
        <div className="cartao cartao-mapa">
          {setores.dados && (
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
    </div>
  )
}
