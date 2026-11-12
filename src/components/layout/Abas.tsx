export type Aba = 'agora' | 'simulacao'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'agora', rotulo: 'Agora' },
  { id: 'simulacao', rotulo: 'Simulação' },
]

/** Aba lida e gravada no endereço (#/agora, #/simulacao), para o link abrir na aba certa. */
export function abaDoEndereco(): Aba {
  return window.location.hash === '#/simulacao' ? 'simulacao' : 'agora'
}

export function Abas({ aba, onAba }: { aba: Aba; onAba: (aba: Aba) => void }) {
  return (
    <div className="abas" role="tablist" aria-label="Modo do gêmeo digital">
      {ABAS.map((a) => (
        <button
          key={a.id}
          type="button"
          role="tab"
          aria-selected={aba === a.id}
          className={`aba${aba === a.id ? ' ativa' : ''}`}
          onClick={() => onAba(a.id)}
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  )
}
