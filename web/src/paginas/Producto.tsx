import { Link, useParams } from 'react-router';
import { useDatos } from '../api';
import { Aviso, Cargando, Insignia, Vacio } from '../componentes/comunes';
import { FormularioMovimiento } from '../componentes/FormularioMovimiento';
import { Minimo } from '../componentes/Minimo';
import { TablaMovimientos } from '../componentes/TablaMovimientos';
import { foto, precio, unidades } from '../formato';
import type { DetalleProducto } from '../tipos';

export function Producto() {
  const { id = '' } = useParams();
  const { datos, error, cargando, recargar } = useDatos<DetalleProducto>(`/productos/${encodeURIComponent(id)}`);

  if (error) {
    return (
      <>
        <Link className="volver" to="/productos">
          ← Volver a productos
        </Link>
        <Aviso>{error}</Aviso>
      </>
    );
  }
  if (!datos) return cargando ? <Cargando /> : null;

  const { producto, movimientos } = datos;
  return (
    <>
      <Link className="volver" to="/productos">
        ← Volver a productos
      </Link>
      <div className="detalle">
        <section className="detalle-info" aria-labelledby="titulo-producto">
          <div className="detalle-cabecera">
            <img src={foto(producto.imagen)} alt={producto.nombre} width={540} height={720} />
            <div>
              <p className="kicker">
                {producto.categoria} · {producto.id}
              </p>
              <h1 id="titulo-producto">{producto.nombre}</h1>
              <p className="tenue">{precio(producto.precio)}</p>
              <p className="detalle-total">
                {unidades(producto.total)} <Insignia estado={producto.estado} />
              </p>
            </div>
          </div>

          <h2>Unidades por talla</h2>
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Talla</th>
                  <th scope="col" className="numero">
                    Unidades
                  </th>
                  <th scope="col">Avisar desde</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {producto.tallas.map((talla) => (
                  <tr key={talla.tallaId ?? 'unica'}>
                    <th scope="row">{talla.talla}</th>
                    <td className="numero fuerte">{talla.cantidad}</td>
                    <td>
                      <Minimo
                        key={`${talla.tallaId}-${talla.minimo}`}
                        productoId={producto.id}
                        talla={talla}
                        alGuardar={recargar}
                      />
                    </td>
                    <td>
                      <Insignia estado={talla.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ayuda">“Avisar desde” es el mínimo: con esa cantidad o menos, la talla pasa a stock bajo.</p>
        </section>

        <FormularioMovimiento producto={producto} alGuardar={recargar} />
      </div>

      <section className="tarjeta" aria-labelledby="titulo-historial">
        <h2 id="titulo-historial">Historial de este producto</h2>
        {movimientos.length === 0 ? (
          <Vacio>Este producto todavía no tiene movimientos.</Vacio>
        ) : (
          <TablaMovimientos movimientos={movimientos} sinProducto />
        )}
        <Link className="enlace-flecha" to={`/movimientos?productoId=${producto.id}`}>
          Ver historial completo ↗
        </Link>
      </section>
    </>
  );
}
