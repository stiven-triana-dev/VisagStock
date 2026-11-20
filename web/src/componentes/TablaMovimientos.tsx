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
      <table className="tabla">
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
              <td className="tenue">{fecha(movimiento.fecha)}</td>
              {!sinProducto && (
                <td>
                  <Link to={`/productos/${movimiento.productoId}`}>{movimiento.producto}</Link>
                </td>
              )}
              <td>{movimiento.talla}</td>
              <td>
                <span className={`tipo tipo-${movimiento.tipo}`}>{TIPOS[movimiento.tipo]}</span>
                {movimiento.condicion && (
                  <span className={`condicion condicion-${movimiento.condicion}`}>
                    {CONDICIONES[movimiento.condicion]}
                  </span>
                )}
              </td>
              <td className={`numero ${movimiento.cantidad < 0 ? 'resta' : movimiento.cantidad > 0 ? 'suma' : 'tenue'}`}>
                {cambio(movimiento.cantidad)}
              </td>
              <td className="numero">{movimiento.stockResultante}</td>
              {!compacta && <td>{movimiento.motivo}</td>}
              {!compacta && <td className="tenue">{movimiento.usuario}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
