import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { EstadoDados } from '../../hooks/useDados'
import type { CenarioSimulacao, ModeloOndaCalor, ModelosOndaCalor, ModoRefugios } from '../../types'
import {
  diasExtrapolados,
  FORM_INICIAL,
  formatar,
  lerNumero,
  MAX_DIAS,
  MAX_HISTORICO_PADRAO,
  validarCenario,
  type ErrosCenario,
  type FormCenario,
} from './cenario'

interface Props {
  modelos: EstadoDados<ModelosOndaCalor>
  distritos: string[]
  enviando: boolean
  /** Erros devolvidos pela API num 400, já traduzidos para os campos. */
  errosApi: ErrosCenario
  onSimular: (cenario: CenarioSimulacao) => void
  /** Quantas UBS a cidade tem, para mostrar a capacidade de ligações por dia. */
  totalUbs?: number
}

const ROTULO_REFUGIOS: Record<ModoRefugios, string> = {
  TODOS: 'Todos: públicos e potenciais',
  PUBLICOS: 'Só os públicos (já funcionam hoje)',
  NENHUM: 'Nenhum refúgio aberto',
}

const icParaTexto = (v: number) => String(v).replace('.', ',')

/** Formulário do cenário: onda de calor (modelo pronto ou personalizada), refúgios, agentes, fator k e região. */
export function FormularioCenario({ modelos, distritos, enviando, errosApi, onSimular, totalUbs }: Props) {
  const [form, setForm] = useState<FormCenario>(FORM_INICIAL)
  const [editarDias, setEditarDias] = useState(false)
  const [errosLocais, setErrosLocais] = useState<ErrosCenario>({})
  const formRef = useRef<HTMLFormElement>(null)
  const escolheuModelo = useRef(false)

  const lista = modelos.dados?.modelos ?? []
  const maxHistorico = modelos.dados?.maxHistoricoC ?? MAX_HISTORICO_PADRAO
  const episodios = useMemo(() => agruparPorEpisodio(lista), [lista])

  const aplicarModelo = (m: ModeloOndaCalor | undefined) => {
    setForm((f) => (m ? { ...f, modeloId: m.id, dias: m.dias.map((d) => icParaTexto(d.icMaxC)) } : { ...f, modeloId: '' }))
    // onda personalizada: abre os dias para editar
    if (!m) setEditarDias(true)
    setErrosLocais({})
  }

  // ao carregar os modelos, começa pela onda real mais recente
  useEffect(() => {
    if (!escolheuModelo.current && lista.length > 0) {
      escolheuModelo.current = true
      aplicarModelo(lista[0])
    }
  }, [lista])

  const erros = { ...errosApi, ...errosLocais }
  const extrapolados = diasExtrapolados(form, maxHistorico)
  const atualizar = <K extends keyof FormCenario>(campo: K, valor: FormCenario[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrosLocais((e) => semCampo(e, campo))
  }

  const mudarDia = (i: number, valor: string) => {
    // mexeu num dia: o cenário deixa de ser o modelo como veio
    setForm((f) => ({ ...f, modeloId: '', dias: f.dias.map((d, j) => (j === i ? valor : d)) }))
    setErrosLocais((e) => semCampo(e, `dia-${i}`))
  }
  const incluirDia = () => setForm((f) => ({ ...f, modeloId: '', dias: [...f.dias, f.dias.at(-1) ?? ''] }))
  const removerDia = (i: number) => {
    setForm((f) => ({ ...f, modeloId: '', dias: f.dias.filter((_, j) => j !== i) }))
    setErrosLocais({})
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const { erros: encontrados, cenario } = validarCenario(form)
    setErrosLocais(encontrados)
    if (!cenario) {
      // leva o foco ao primeiro campo destacado
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    onSimular({ ...cenario, nome: cenario.nome ?? lista.find((m) => m.id === cenario.modeloId)?.nome })
  }

  const modeloAtual = lista.find((m) => m.id === form.modeloId)
  const temErroDia = Object.keys(erros).some((k) => k === 'dias' || k.startsWith('dia-'))
  const diasAbertos = editarDias || temErroDia
  const valores = form.dias.map(lerNumero)
  const pico = Math.max(...valores.map((v) => v ?? -Infinity))
  const diaPico = valores.indexOf(pico) + 1
  const agentes = lerNumero(form.agentesPorUbs)
  const contatos = lerNumero(form.contatosPorAgenteDia)
  const porUbs = agentes != null && contatos != null && agentes > 0 && contatos > 0 ? agentes * contatos : null
  const temErroAvancado = Boolean(erros.fatorK || erros.distrito)
  const props = (campo: string) => ({
    'aria-invalid': erros[campo] ? true : undefined,
    'aria-describedby': erros[campo] ? `erro-${campo}` : undefined,
    className: erros[campo] ? 'campo-invalido' : undefined,
  })

  return (
    <form ref={formRef} className="cenario-campos" onSubmit={enviar} noValidate>
      <section className="cenario-bloco" aria-labelledby="bloco-onda">
        <h3 id="bloco-onda">1. Onda de calor</h3>
        <p className="nota-campo">Quantos dias e quão quente. Comece por uma onda que já aconteceu em Prudente ou monte a sua.</p>
        <label>
          <span className="sr-only">Onda de calor</span>
          <select
            value={form.modeloId}
            onChange={(e) => aplicarModelo(lista.find((m) => m.id === e.target.value))}
            disabled={modelos.carregando}
          >
            <option value="">Personalizada</option>
            {episodios.map(([titulo, itens]) => (
              <optgroup key={titulo} label={titulo}>
                {itens.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.tipo === 'REAL' ? 'Como aconteceu' : `+ ${formatar(m.acrescimoC, 0)} °C`} · até NC{m.nivelMaximo}
                    {m.diasExtrapolados > 0 ? ' · extrapolação' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {modelos.carregando && <span className="nota-campo">Carregando as ondas de calor da A707…</span>}
        {modelos.erro && (
          <span className="nota-campo estado-erro">
            Os modelos prontos não carregaram ({modelos.erro}). Dá para montar a onda à mão.{' '}
            <button type="button" className="botao-link" onClick={modelos.recarregar}>
              Tentar de novo
            </button>
          </span>
        )}
        <p className="resumo-onda">
          <strong>{form.dias.length} dias</strong>
          {Number.isFinite(pico) && (
            <>
              {' '}
              · pico de {formatar(pico)} °C no dia {diaPico}
            </>
          )}
          {modeloAtual && <span className="nota-campo"> · {modeloAtual.tipo === 'REAL' ? 'série real da estação INMET A707' : 'variação da onda real'}</span>}
        </p>

        <details className="detalhes" open={diasAbertos} onToggle={(e) => setEditarDias(e.currentTarget.open)}>
          <summary>Editar o índice de calor de cada dia</summary>
          <fieldset className="cenario-dias" aria-describedby={erros.dias ? 'erro-dias' : undefined}>
            <legend>Índice de calor máximo de cada dia (°C)</legend>
            <div className="grade-dias">
              {form.dias.map((valor, i) => {
                const extrapolado = extrapolados.includes(i)
                return (
                  <div key={i} className={`campo-dia${extrapolado ? ' campo-extrapolado' : ''}`}>
                    <label htmlFor={`dia-${i}`}>Dia {i + 1}</label>
                    <div className="campo-dia-linha">
                      <input
                        id={`dia-${i}`}
                        inputMode="decimal"
                        value={valor}
                        onChange={(e) => mudarDia(i, e.target.value)}
                        {...props(`dia-${i}`)}
                      />
                      <button
                        type="button"
                        className="botao-icone botao-remover"
                        onClick={() => removerDia(i)}
                        disabled={form.dias.length === 1}
                        aria-label={`Remover o dia ${i + 1}`}
                      >
                        ×
                      </button>
                    </div>
                    {erros[`dia-${i}`] && (
                      <span id={`erro-dia-${i}`} className="erro-campo">
                        {erros[`dia-${i}`]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <button type="button" className="botao-link" onClick={incluirDia} disabled={form.dias.length >= MAX_DIAS}>
              + incluir dia
            </button>
            {erros.dias && (
              <span id="erro-dias" className="erro-campo">
                {erros.dias}
              </span>
            )}
          </fieldset>
        </details>

        {extrapolados.length > 0 && (
          <p className="aviso-extrapolacao" role="status">
            <strong>Acima do máximo histórico da A707 ({formatar(maxHistorico, 2)} °C):</strong>{' '}
            {extrapolados.map((i) => `dia ${i + 1}`).join(', ')}. Esses dias são extrapolação: a estação nunca registrou um
            índice de calor tão alto.
          </p>
        )}
      </section>

      <section className="cenario-bloco" aria-labelledby="bloco-equipe">
        <h3 id="bloco-equipe">2. Equipe de busca ativa</h3>
        <p className="nota-campo">Quantas ligações cada UBS consegue fazer por dia. Quem não for contatado passa para o dia seguinte.</p>
        <div className="cenario-par">
          <label>
            Agentes por UBS
            <input inputMode="numeric" value={form.agentesPorUbs} onChange={(e) => atualizar('agentesPorUbs', e.target.value)} {...props('agentesPorUbs')} />
            {erros.agentesPorUbs && <span id="erro-agentesPorUbs" className="erro-campo">{erros.agentesPorUbs}</span>}
          </label>
          <label>
            Ligações por agente/dia
            <input
              inputMode="numeric"
              value={form.contatosPorAgenteDia}
              onChange={(e) => atualizar('contatosPorAgenteDia', e.target.value)}
              {...props('contatosPorAgenteDia')}
            />
            {erros.contatosPorAgenteDia && (
              <span id="erro-contatosPorAgenteDia" className="erro-campo">{erros.contatosPorAgenteDia}</span>
            )}
          </label>
        </div>
        {porUbs != null && (
          <p className="resumo-onda">
            = <strong>{porUbs.toLocaleString('pt-BR')} ligações por UBS por dia</strong>
            {totalUbs ? (
              <span className="nota-campo">
                {' '}
                · {(porUbs * totalUbs).toLocaleString('pt-BR')} por dia nas {totalUbs} UBS da cidade
              </span>
            ) : null}
          </p>
        )}
      </section>

      <section className="cenario-bloco" aria-labelledby="bloco-refugios">
        <h3 id="bloco-refugios">3. Refúgios climáticos</h3>
        <p className="nota-campo">
          Lugares frescos para onde o idoso pode ir. O resultado conta quem fica a mais de 800 m (em linha reta) do refúgio mais próximo.
        </p>
        <label>
          <span className="sr-only">Refúgios considerados</span>
          <select value={form.refugios} onChange={(e) => atualizar('refugios', e.target.value as ModoRefugios)}>
            {(Object.keys(ROTULO_REFUGIOS) as ModoRefugios[]).map((r) => (
              <option key={r} value={r}>
                {ROTULO_REFUGIOS[r]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <details className="detalhes cenario-avancado" open={temErroAvancado || undefined}>
        <summary>Avançado: região, fator k e nome</summary>
        <label>
          Região
          <select value={form.distrito} onChange={(e) => atualizar('distrito', e.target.value)} {...props('distrito')}>
            <option value="">Cidade toda</option>
            {distritos.map((d) => (
              <option key={d} value={d}>
                Distrito {d}
              </option>
            ))}
          </select>
          {erros.distrito && <span id="erro-distrito" className="erro-campo">{erros.distrito}</span>}
        </label>

        <label>
          Fator k (estimativa)
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="0.5"
            value={form.fatorK}
            onChange={(e) => atualizar('fatorK', e.target.value)}
            {...props('fatorK')}
          />
          <span className="nota-campo">
            Quanto o calor do chão de cada setor (satélite) pesa no calor estimado do bairro. Só muda o mapa de IC estimado; 0,25 é o padrão.
          </span>
          {erros.fatorK && <span id="erro-fatorK" className="erro-campo">{erros.fatorK}</span>}
        </label>

        <label>
          Nome (opcional)
          <input value={form.nome} maxLength={120} placeholder={modeloAtual?.nome ?? 'Ex.: Março sem refúgios'} onChange={(e) => atualizar('nome', e.target.value)} />
        </label>
      </details>

      <div className="cenario-acoes">
        <button type="submit" className="botao-primario" disabled={enviando}>
          {enviando ? 'Simulando…' : 'Simular'}
        </button>
      </div>
    </form>
  )
}

function semCampo(erros: ErrosCenario, campo: string): ErrosCenario {
  const copia = { ...erros }
  delete copia[campo]
  return copia
}

/** [título do episódio, modelos do episódio], mantendo a ordem da API (mais recentes primeiro). */
function agruparPorEpisodio(modelos: ModeloOndaCalor[]): [string, ModeloOndaCalor[]][] {
  const grupos = new Map<string, ModeloOndaCalor[]>()
  for (const m of modelos) {
    const chave = m.inicioEpisodio
    grupos.set(chave, [...(grupos.get(chave) ?? []), m])
  }
  return [...grupos.values()].map((itens) => {
    const real = itens.find((m) => m.tipo === 'REAL') ?? itens[0]
    return [`${real.nome.replace(/ \+ .*$/, '')} (${real.diasEpisodio} dias)`, itens]
  })
}
