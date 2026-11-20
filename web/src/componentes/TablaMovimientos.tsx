import { Link } from 'react-router';
import { cambio, CONDICIONES, fecha, TIPOS } from '../formato';
import type { Movimiento } from '../tipos';

interface Props {
  movimientos: Movimiento[];
  compacta?: boolean;
  sinProducto?: boolean;
}

export function TablaMovimientos({ movimientos, compacta = false, sinProducto = false }: Props) {
  return (
    <div className="tabla-envoltura">
      <table className="tabla tabla-movimientos">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            {!sinProducto && <th scope="col">Producto</th>}
            <th scope="col">Talla</th>
            <th scope="col">Tipo</th>
            <th scope="col" className="numero">
              Cambio
            </th>
            <th scope="col" className="numero">
              Queda
            </th>
            {!compacta && <th scope="col">Motivo</th>}
            {!compacta && <th scope="col">Usuario</th>}
          </tr>
        </thead>
        <tbody>
          {movimientos.map((movimiento) => (
            <tr key={movimiento.id}>
              <td className="tenue col-fecha">{fecha(movimiento.fecha)}</td>
              {!sinProducto && (
                <td className="col-producto">
                  <Link to={`/productos/${movimiento.productoId}`}>{movimiento.producto}</Link>
                </td>
              )}
              <td className="col-talla">{movimiento.talla}</td>
              <td className="col-tipo">
                <span className={`tipo tipo-${movimiento.tipo}`}>{TIPOS[movimiento.tipo]}</span>
                {movimiento.condicion && (
                  <span className={`condicion condicion-${movimiento.condicion}`}>
                    {CONDICIONES[movimiento.condicion]}
                  </span>
                )}
              </td>
              <td
                className={`numero col-cambio ${movimiento.cantidad < 0 ? 'resta' : movimiento.cantidad > 0 ? 'suma' : 'tenue'}`}
              >
                {cambio(movimiento.cantidad)}
              </td>
              <td className="numero col-queda">{movimiento.stockResultante}</td>
              {!compacta && <td className="col-motivo">{movimiento.motivo}</td>}
              {!compacta && <td className="tenue col-usuario">{movimiento.usuario}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
