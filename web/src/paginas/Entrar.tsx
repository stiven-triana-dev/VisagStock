import { useState, type FormEvent } from 'react';
import { useDatos } from '../api';
import { Aviso } from '../componentes/comunes';
import { useSesion } from '../sesion';

export function Entrar() {
  const { entrar, entrarComoInvitado } = useSesion();
  const { datos: invitado } = useDatos<{ activo: boolean }>('/invitado');
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function intentar(accion: () => Promise<void>) {
    setError(null);
    setEnviando(true);
    try {
      await accion();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo iniciar sesión');
      setEnviando(false);
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    void intentar(() => entrar(usuario.trim(), clave));
  }

  return (
    <main className="entrar">
      <section className="entrar-panel" aria-labelledby="titulo-entrar">
        <img className="entrar-logo" src="/logo-visagshop.png" alt="" width="56" height="56" />
        <p className="kicker">VisagShop · Inventario</p>
        <h1 id="titulo-entrar">
          Visag<em>Stock</em>
        </h1>
        <p className="entrar-ayuda">Controla las unidades de cada talla: ingresos, despachos, devoluciones y bajas de la tienda.</p>
        <form onSubmit={enviar} noValidate>
          <label htmlFor="usuario">Usuario</label>
          <input
            id="usuario"
            name="usuario"
            autoComplete="username"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
          <label htmlFor="clave">Contraseña</label>
          <input
            id="clave"
            name="clave"
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
          {error && <Aviso>{error}</Aviso>}
          <button type="submit" className="boton boton-oscuro" disabled={enviando || !usuario || !clave}>
            {enviando ? 'Entrando…' : 'Entrar ↗'}
          </button>
        </form>
        {invitado?.activo && (
          <div className="entrar-invitado">
            <p>
              <strong>¿Vienes a ver el proyecto?</strong> Entra sin contraseña y prueba todo. Los cambios no se
              guardan.
            </p>
            <button
              type="button"
              className="boton boton-claro"
              disabled={enviando}
              onClick={() => void intentar(entrarComoInvitado)}
            >
              Entrar como invitado ↗
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
