import { useState, type FormEvent } from 'react';
import { Aviso } from '../componentes/comunes';
import { useSesion } from '../sesion';

export function Entrar() {
  const { entrar } = useSesion();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await entrar(usuario.trim(), clave);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo iniciar sesión');
      setEnviando(false);
    }
  }

  return (
    <main className="entrar">
      <section className="entrar-panel" aria-labelledby="titulo-entrar">
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
      </section>
    </main>
  );
}
