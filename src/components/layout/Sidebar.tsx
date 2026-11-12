import icone from '../../assets/thermocity-icone.png'

/** Barra lateral azul: marca, seção atual e usuário. */
export function Sidebar({ usuario }: { usuario: string }) {
  return (
    <aside className="sidebar">
      <div className="marca">
        <img src={icone} alt="" className="marca-icone" />
        <span className="marca-nome">
          <b>THERMO</b>
          <span>city</span>
        </span>
        <span className="marca-slogan">O calor é invisível, o cuidado não</span>
      </div>

      <nav className="menu" aria-label="Seções do painel">
        <span className="menu-item ativo" aria-current="page">
          Gêmeo digital
        </span>
      </nav>

      <div className="sidebar-rodape">
        <span className="sidebar-usuario">{usuario}</span>
        <span className="sidebar-papel">Gestor de saúde</span>
      </div>
    </aside>
  )
}
