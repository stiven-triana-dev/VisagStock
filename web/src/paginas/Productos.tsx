import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useDatos } from '../api';
import { Aviso, Cargando, Insignia, Paginacion, Titulo, Vacio } from '../componentes/comunes';
import { foto, unidades } from '../formato';
import type { Estado, ListaProductos } from '../tipos';

const FILTROS: { valor: Estado | ''; texto: string }[] = [
  { valor: '', texto: 'Todos' },
  { valor: 'disponible', texto: 'Disponibles' },
  { valor: 'bajo', texto: 'Stock bajo' },
  { valor: 'agotado', texto: 'Agotados' },
];

export function Productos() {
  const [parametros, setParametros] = useSearchParams();
  const buscar = parametros.get('buscar') ?? '';
  const estado = parametros.get('estado') ?? '';
  const pagina = Number(parametros.get('pagina') ?? '1') || 1;
  const [texto, setTexto] = useState(buscar);

  useEffect(() => {
    setTexto((actual) => (actual.trim() === buscar ? actual : buscar));
  }, [buscar]);

  useEffect(() => {
    if (texto.trim() === buscar) return;
    const espera = window.setTimeout(() => cambiar({ buscar: texto.trim(), pagina: '' }), 350);
    return () => window.clearTimeout(espera);
  });

  function cambiar(nuevos: Record<string, string>) {
    const siguiente = new URLSearchParams(parametros);
    for (const [clave, valor] of Object.entries(nuevos)) {
      if (valor) siguiente.set(clave, valor);
      else siguiente.delete(clave);
    }
    setParametros(siguiente, { replace: true });
  }

  const consulta = new URLSearchParams({ pagina: String(pagina), porPagina: '24' });
  if (buscar) consulta.set('buscar', buscar);
  if (estado) consulta.set('estado', estado);
  const { datos, error, cargando } = useDatos<ListaProductos>(`/productos?${consulta.toString()}`);

  return (
    <>
      <Titulo kicker="Catálogo" antes="Stock por" acento="talla." />
      <div className="filtros">
        <label className="buscador">
          <span className="sr-only">Buscar productos</span>
          <input
            type="search"
            placeholder="Buscar por nombre o categoría"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </label>
        <div className="chips" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((filtro) => (
            <button
              key={filtro.valor || 'todos'}
              type="button"
              className="chip"
              aria-pressed={estado === filtro.valor}
              onClick={() => cambiar({ estado: filtro.valor, pagina: '' })}
            >
              {filtro.texto}
            </button>
          ))}
        </div>
      </div>

      {error && <Aviso>{error}</Aviso>}
      {cargando && !datos && <Cargando />}
      {datos && (
        <>
          <p className="conteo" aria-live="polite">
            {datos.total === 1 ? '1 producto' : `${datos.total} productos`}
          </p>
          {datos.productos.length === 0 ? (
            <Vacio>No encontramos productos con esos filtros.</Vacio>
          ) : (
            <ul className="rejilla">
              {datos.productos.map((producto) => (
                <li key={producto.id}>
                  <Link to={`/productos/${producto.id}`} className="producto">
                    <div className="producto-foto">
                      <img src={foto(producto.imagen, true)} alt="" width={360} height={450} loading="lazy" />
                      <Insignia estado={producto.estado} />
                    </div>
                    <p className="producto-categoria">{producto.categoria}</p>
                    <h2 className="producto-nombre">{producto.nombre}</h2>
                    <p className="producto-total">{unidades(producto.total)}</p>
                    <ul className="tallas" aria-label="Unidades por talla">
                      {producto.tallas.map((talla) => (
                        <li key={talla.tallaId ?? 'unica'} className={`talla talla-${talla.estado}`}>
                          <span>{talla.talla}</span>
                          <strong>{talla.cantidad}</strong>
                        </li>
                      ))}
                    </ul>
                  </Link>
                </li>
              ))}
            </ul>
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
