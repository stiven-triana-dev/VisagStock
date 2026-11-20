import { Link, useSearchParams } from 'react-router';
import { useDatos } from '../api';
import { Aviso, Cargando, Paginacion, Titulo, Vacio } from '../componentes/comunes';
import { TablaMovimientos } from '../componentes/TablaMovimientos';
import { TIPOS } from '../formato';
import type { ListaMovimientos, TipoMovimiento } from '../tipos';

export function Movimientos() {
  const [parametros, setParametros] = useSearchParams();
  const productoId = parametros.get('productoId') ?? '';
  const tipo = parametros.get('tipo') ?? '';
  const desde = parametros.get('desde') ?? '';
  const hasta = parametros.get('hasta') ?? '';
  const pagina = Number(parametros.get('pagina') ?? '1') || 1;

  function cambiar(nuevos: Record<string, string>) {
    const siguiente = new URLSearchParams(parametros);
    for (const [clave, valor] of Object.entries(nuevos)) {
      if (valor) siguiente.set(clave, valor);
      else siguiente.delete(clave);
    }
    setParametros(siguiente, { replace: true });
  }

  const consulta = new URLSearchParams({ pagina: String(pagina), porPagina: '30' });
  for (const [clave, valor] of Object.entries({ productoId, tipo, desde, hasta })) if (valor) consulta.set(clave, valor);
  const { datos, error, cargando } = useDatos<ListaMovimientos>(`/movimientos?${consulta.toString()}`);
  const hayFiltros = Boolean(productoId || tipo || desde || hasta);

  return (
    <>
      <Titulo kicker="Kárdex" antes="Historial de" acento="movimientos." />
      <div className="filtros filtros-movimientos">
        <label>
          Tipo
          <select value={tipo} onChange={(e) => cambiar({ tipo: e.target.value, pagina: '' })}>
            <option value="">Todos</option>
            {(Object.keys(TIPOS) as TipoMovimiento[]).map((opcion) => (
              <option key={opcion} value={opcion}>
                {TIPOS[opcion]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={desde} max={hasta || undefined} onChange={(e) => cambiar({ desde: e.target.value, pagina: '' })} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} min={desde || undefined} onChange={(e) => cambiar({ hasta: e.target.value, pagina: '' })} />
        </label>
        {hayFiltros && (
          <button type="button" className="boton-enlace" onClick={() => setParametros({}, { replace: true })}>
            Quitar filtros
          </button>
        )}
      </div>
      {productoId && (
        <p className="filtro-producto">
          Mostrando solo el producto <Link to={`/productos/${productoId}`}>{productoId}</Link>.
        </p>
      )}

      {error && <Aviso>{error}</Aviso>}
      {cargando && !datos && <Cargando />}
      {datos && (
        <>
          <p className="conteo" aria-live="polite">
            {datos.total === 1 ? '1 movimiento' : `${datos.total} movimientos`}
          </p>
          {datos.movimientos.length === 0 ? (
            <Vacio>{hayFiltros ? 'No hay movimientos con esos filtros.' : 'Todavía no hay movimientos.'}</Vacio>
          ) : (
            <section className="tarjeta">
              <TablaMovimientos movimientos={datos.movimientos} />
            </section>
          )}
          <Paginacion
            pagina={datos.pagina}
            porPagina={datos.porPagina}
            total={datos.total}
            alCambiar={(nueva) => cambiar({ pagina: String(nueva) })}
          />
        </>
      )}
    </>
  );
}
