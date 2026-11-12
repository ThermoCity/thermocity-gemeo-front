import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import type { Servico, SetorFeature, SetorProps } from '../../types'
import { CAMADAS, type CamadaPreenchimento } from './escalas'
import { caixaDe, caminhoSetor, METROS_POR_UNIDADE, projetar, type Caixa } from './projecao'

interface Props {
  setores: SetorFeature[]
  servicos: Servico[]
  selecionado: string | null
  onSelecionar: (codigo: string | null) => void
  /** Setores com pessoas na lista do dia (recebem contorno). */
  destacados?: Set<string>
  /** Rótulo no canto do mapa, ex.: "Dados demonstrativos" ou "Simulação". */
  selo?: string
}

const ESCALAS_BARRA = [100, 200, 500, 1000, 2000, 5000, 10000]

export function MapaSetores({ setores, servicos, selecionado, onSelecionar, destacados, selo }: Props) {
  const [camada, setCamada] = useState<CamadaPreenchimento>('calor')
  const [mostrarUbs, setMostrarUbs] = useState(true)
  const [mostrarRefugios, setMostrarRefugios] = useState(true)
  const [hover, setHover] = useState<{ p: SetorProps; x: number; y: number } | null>(null)

  const caminhos = useMemo(() => setores.map((f) => ({ f, d: caminhoSetor(f) })), [setores])
  const caixaInicial = useMemo<Caixa>(() => {
    // Abre na mancha urbana da sede (os distritos rurais ficam a dezenas de km ao norte).
    const urbanos = setores.filter((f) => f.properties.situacao === 'Urbana' && f.properties.distrito === 'Presidente Prudente')
    const c = caixaDe(urbanos.length ? urbanos : setores)
    const m = c.w * 0.04
    return { x: c.x - m, y: c.y - m, w: c.w + 2 * m, h: c.h + 2 * m }
  }, [setores])
  const caixaTotal = useMemo(() => caixaDe(setores), [setores])

  const [vista, setVista] = useState<Caixa>(caixaInicial)
  useEffect(() => setVista(caixaInicial), [caixaInicial])

  const svgRef = useRef<SVGSVGElement>(null)
  const arraste = useRef<{ x: number; y: number; vista: Caixa; moveu: boolean } | null>(null)
  const [larguraPx, setLarguraPx] = useState(800)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const obs = new ResizeObserver(([e]) => setLarguraPx(e.contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const paraMundo = (cx: number, cy: number): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect()
    const escala = Math.max(vista.w / r.width, vista.h / r.height)
    const ox = vista.x + (vista.w - r.width * escala) / 2
    const oy = vista.y + (vista.h - r.height * escala) / 2
    return [ox + (cx - r.left) * escala, oy + (cy - r.top) * escala]
  }

  const zoom = (fator: number, centro?: [number, number]) => {
    setVista((v) => {
      const [cx, cy] = centro ?? [v.x + v.w / 2, v.y + v.h / 2]
      const w = Math.min(Math.max(v.w * fator, caixaInicial.w / 20), caixaTotal.w * 1.6)
      const k = w / v.w
      return { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w, h: v.h * k }
    })
  }

  const aoRolar = (e: WheelEvent<SVGSVGElement>) => zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, paraMundo(e.clientX, e.clientY))

  const aoPressionar = (e: PointerEvent<SVGSVGElement>) => {
    arraste.current = { x: e.clientX, y: e.clientY, vista, moveu: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const aoMover = (e: PointerEvent<SVGSVGElement>) => {
    const a = arraste.current
    if (!a) return
    const r = svgRef.current!.getBoundingClientRect()
    const escala = Math.max(a.vista.w / r.width, a.vista.h / r.height)
    const dx = (e.clientX - a.x) * escala
    const dy = (e.clientY - a.y) * escala
    if (Math.abs(e.clientX - a.x) + Math.abs(e.clientY - a.y) > 3) a.moveu = true
    setVista({ ...a.vista, x: a.vista.x - dx, y: a.vista.y - dy })
  }
  const aoSoltar = () => {
    arraste.current = null
  }

  const clicouSetor = (codigo: string) => {
    if (arraste.current?.moveu) return
    onSelecionar(codigo === selecionado ? null : codigo)
  }

  // Barra de escala
  const metrosPorPx = (vista.w * METROS_POR_UNIDADE) / larguraPx
  const metrosBarra = ESCALAS_BARRA.find((m) => m / metrosPorPx >= 70) ?? 10000
  const pxBarra = metrosBarra / metrosPorPx
  const traco = vista.w / larguraPx

  const pontos = servicos.filter((s) => (s.tipo === 'UBS' ? mostrarUbs : mostrarRefugios))
  const def = CAMADAS[camada]

  return (
    <div className="mapa">
      <div className="mapa-barra">
        <label className="campo-inline">
          <span>Camada</span>
          <select value={camada} onChange={(e) => setCamada(e.target.value as CamadaPreenchimento)}>
            <option value="calor">Nota de calor do setor</option>
            <option value="ipvs">Vulnerabilidade (IPVS)</option>
            <option value="idosos">Idosos 60+</option>
          </select>
        </label>
        <label className="campo-check">
          <input type="checkbox" checked={mostrarUbs} onChange={(e) => setMostrarUbs(e.target.checked)} /> UBS
        </label>
        <label className="campo-check">
          <input type="checkbox" checked={mostrarRefugios} onChange={(e) => setMostrarRefugios(e.target.checked)} /> Refúgios
        </label>
      </div>

      <div className="mapa-area">
        <svg
          ref={svgRef}
          className="mapa-svg"
          viewBox={`${vista.x} ${vista.y} ${vista.w} ${vista.h}`}
          preserveAspectRatio="xMidYMid meet"
          onWheel={aoRolar}
          onPointerDown={aoPressionar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerLeave={() => {
            aoSoltar()
            setHover(null)
          }}
          role="img"
          aria-label={`Mapa dos setores de Presidente Prudente colorido por ${def.titulo.toLowerCase()}`}
        >
          {caminhos.map(({ f, d }) => (
            <path
              key={f.id}
              d={d}
              fill={def.cor(f.properties)}
              className={`setor${f.id === selecionado ? ' setor-selecionado' : ''}${destacados?.has(f.id) ? ' setor-destacado' : ''}`}
              vectorEffect="non-scaling-stroke"
              onClick={() => clicouSetor(f.id)}
              onPointerMove={(e) => setHover({ p: f.properties, x: e.clientX, y: e.clientY })}
            />
          ))}
          {pontos.map((s) => {
            const [x, y] = projetar(s.lon, s.lat)
            return s.tipo === 'UBS' ? (
              <rect key={s.id} x={x - 4 * traco} y={y - 4 * traco} width={8 * traco} height={8 * traco} className="ponto-ubs">
                <title>{`UBS · ${s.nome}`}</title>
              </rect>
            ) : (
              <circle key={s.id} cx={x} cy={y} r={4 * traco} className={s.revisao === 'manter' ? 'ponto-refugio' : 'ponto-refugio-potencial'}>
                <title>{`Refúgio ${s.revisao === 'manter' ? 'público' : 'potencial'} · ${s.nome}`}</title>
              </circle>
            )
          })}
        </svg>

        <div className="mapa-controles" role="group" aria-label="Zoom do mapa">
          <button type="button" onClick={() => zoom(1 / 1.4)} aria-label="Aproximar">+</button>
          <button type="button" onClick={() => zoom(1.4)} aria-label="Afastar">−</button>
          <button type="button" onClick={() => setVista(caixaInicial)} aria-label="Voltar à área urbana" title="Área urbana">⌂</button>
        </div>

        <div className="mapa-legenda">
          <strong>{def.titulo}</strong>
          {def.legenda.map((l) => (
            <span key={l.rotulo} className="legenda-item">
              <i style={{ background: l.cor }} />
              {l.rotulo}
            </span>
          ))}
          {(mostrarUbs || mostrarRefugios) && <hr />}
          {mostrarUbs && (
            <span className="legenda-item">
              <i className="legenda-ubs" /> UBS
            </span>
          )}
          {mostrarRefugios && (
            <>
              <span className="legenda-item">
                <i className="legenda-refugio" /> Refúgio público
              </span>
              <span className="legenda-item">
                <i className="legenda-refugio-potencial" /> Refúgio potencial
              </span>
            </>
          )}
        </div>

        <div className="mapa-escala" aria-hidden="true">
          <span style={{ width: pxBarra }} />
          {metrosBarra >= 1000 ? `${metrosBarra / 1000} km` : `${metrosBarra} m`}
        </div>
        {selo && <div className="mapa-selo">{selo}</div>}

        {hover && !arraste.current && (
          <div className="mapa-dica" style={{ left: hover.x + 14, top: hover.y + 14 }}>
            <strong>Setor {hover.p.codigo.slice(-4)}</strong>
            <span>Nota de calor: {hover.p.classeCalor ?? '—'}</span>
            <span>IPVS: {hover.p.ipvsGrupo ?? 'sem classificação'}</span>
            <span>Idosos 60+: {hover.p.pop60mais ?? 'suprimido'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
