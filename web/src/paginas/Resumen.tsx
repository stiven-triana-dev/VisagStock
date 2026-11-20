import { Link } from 'react-router';
import { useDatos } from '../api';
import { Aviso, Cargando, Insignia, Titulo, Vacio } from '../componentes/comunes';
import { TablaMovimientos } from '../componentes/TablaMovimientos';
import { cifra, unidades } from '../formato';
import type { Resumen as DatosResumen } from '../tipos';

function Dato({ cantidad, texto }: { cantidad: number; texto: string }) {
  return (
    <li>
      <strong>{unidades(cantidad)}</strong> {cantidad === 1 ? texto : `${texto}s`}
    </li>
  );
}

export function Resumen() {
  const { datos, error, cargando } = useDatos<DatosResumen>('/resumen');

  return (
    <>
      <Titulo kicker="Panel" antes="Así está tu" acento="inventario." />
      {error && <Aviso>{error}</Aviso>}
      {cargando && !datos && <Cargando />}
      {datos && (
        <>
          <section className="cifras" aria-label="Cifras generales">
            <article className="cifra">
              <p>Productos</p>
              <strong>{cifra(datos.productos)}</strong>
            </article>
            <article className="cifra">
              <p>Unidades en tienda</p>
              <strong>{cifra(datos.unidades)}</strong>
            </article>
            <Link className="cifra cifra-alerta" to="/productos?estado=bajo">
              <p>Con stock bajo</p>
              <strong>{cifra(datos.bajos)}</strong>
            </Link>
            <Link className="cifra cifra-agotado" to="/productos?estado=agotado">
              <p>Agotados</p>
              <strong>{cifra(datos.agotados)}</strong>
            </Link>
          </section>

          <section className="semana" aria-labelledby="titulo-semana">
            <h2 id="titulo-semana">Últimos 7 días</h2>
            <ul className="semana-datos">
              <li>
                <strong>{cifra(datos.ultimos7Dias.movimientos)}</strong> movimientos
              </li>
              <Dato cantidad={datos.ultimos7Dias.ingresos} texto="ingresada" />
              <Dato cantidad={datos.ultimos7Dias.despachos} texto="despachada" />
              <Dato cantidad={datos.ultimos7Dias.devoluciones} texto="devuelta" />
              <Dato cantidad={datos.ultimos7Dias.danadas} texto="dañada" />
            </ul>
          </section>

          <div className="dos-columnas">
            <section className="tarjeta" aria-labelledby="titulo-alertas">
              <h2 id="titulo-alertas">Por reponer pronto</h2>
              {datos.unidades === 0 ? (
                <Vacio>
                  Aún no hay unidades registradas. Abre un producto en <Link to="/productos">Productos</Link> y registra
                  su primer ingreso.
                </Vacio>
              ) : datos.alertas.length === 0 ? (
                <Vacio>No hay productos con pocas unidades. ¡Todo en orden!</Vacio>
              ) : (
                <ul className="alertas">
                  {datos.alertas.map((producto) => {
                    const bajas = producto.tallas.filter((talla) => talla.estado !== 'disponible');
                    return (
                      <li key={producto.id}>
                        <Link to={`/productos/${producto.id}`}>
                          <span className="alerta-nombre">{producto.nombre}</span>
                          <span className="alerta-tallas">
                            {bajas.map((talla) => `${talla.talla}: ${talla.cantidad}`).join(' · ')}
                          </span>
                        </Link>
                        <Insignia estado={producto.estado} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="tarjeta" aria-labelledby="titulo-recientes">
              <h2 id="titulo-recientes">Movimientos recientes</h2>
              {datos.recientes.length === 0 ? (
                <Vacio>Todavía no hay movimientos. Registra el primer ingreso desde un producto.</Vacio>
              ) : (
                <TablaMovimientos movimientos={datos.recientes} compacta />
              )}
              <Link className="enlace-flecha" to="/movimientos">
                Ver todo el historial ↗
              </Link>
            </section>
          </div>
        </>
      )}
    </>
  );
}
