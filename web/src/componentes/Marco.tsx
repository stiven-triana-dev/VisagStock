import { NavLink, Outlet } from 'react-router';
import { useSesion } from '../sesion';

const ENLACES = [
  { a: '/', texto: 'Resumen', fin: true },
  { a: '/productos', texto: 'Productos', fin: false },
  { a: '/movimientos', texto: 'Movimientos', fin: false },
];

export function Marco() {
  const { usuario, invitado, salir } = useSesion();
  return (
    <>
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <header className="barra">
        <NavLink to="/" className="marca" aria-label="VisagStock, ir al resumen">
          <img className="marca-logo" src="/logo-visagshop.png" alt="" width="52" height="52" />
          <span className="marca-texto">
            VISAG<span>STOCK</span>
            <small>INVENTARIO / COLOMBIA</small>
          </span>
        </NavLink>
        <nav className="menu" aria-label="Principal">
          {ENLACES.map((enlace) => (
            <NavLink key={enlace.a} to={enlace.a} end={enlace.fin}>
              {enlace.texto}
            </NavLink>
          ))}
        </nav>
        <div className="cuenta">
          <span className="cuenta-usuario">{usuario}</span>
          <button type="button" className="boton-enlace" onClick={() => void salir()}>
            Salir
          </button>
        </div>
      </header>
      {invitado && (
        <p className="aviso-invitado" role="status">
          <strong>Modo invitado.</strong> Puedes probar todo: el sistema valida y calcula cada movimiento, pero no guarda
          los cambios.
        </p>
      )}
      <main id="contenido" className="contenido" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
