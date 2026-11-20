import { useState, type FormEvent } from 'react';
import { ErrorApi, pedir } from '../api';
import { CONDICIONES, quedan, TIPOS, unidades } from '../formato';
import { useSesion } from '../sesion';
import type { Condicion, Movimiento, ProductoStock, TipoMovimiento } from '../tipos';
import { Aviso } from './comunes';

const MOTIVOS: Record<TipoMovimiento, string[]> = {
  ingreso: ['Compra a proveedor', 'Producción del taller', 'Traslado desde otra tienda'],
  despacho: ['Venta en tienda', 'Venta por WhatsApp', 'Venta al por mayor', 'Envío a domicilio'],
  devolucion: ['Cambio de talla', 'Cliente insatisfecho', 'Defecto de fábrica', 'Llegó dañada al cliente'],
  baja: ['Prenda dañada en tienda', 'Prenda manchada', 'Pérdida o robo', 'Defecto de fábrica'],
  ajuste: ['Conteo físico', 'Corrección de un registro'],
};

const AYUDAS: Record<TipoMovimiento, string> = {
  ingreso: 'Suma unidades: llegó mercancía del proveedor o del taller.',
  despacho: 'Resta unidades: la prenda salió hacia el cliente.',
  devolucion: 'El cliente devolvió la prenda. En buen estado vuelve a la venta; dañada solo queda registrada.',
  baja: 'Resta unidades que ya no se pueden vender: prenda dañada, manchada o perdida en la tienda.',
  ajuste: 'Escribe cuántas unidades contaste. Se corrige la diferencia.',
};

const REGISTRADO: Record<TipoMovimiento, string> = {
  ingreso: 'Ingreso registrado.',
  despacho: 'Despacho registrado.',
  devolucion: 'Devolución registrada.',
  baja: 'Baja registrada.',
  ajuste: 'Ajuste registrado.',
};

interface Props {
  producto: ProductoStock;
  alGuardar: (movimiento: Movimiento) => void;
}

function calcular(tipo: TipoMovimiento, condicion: Condicion | null, actual: number, valor: number): number | null {
  if (tipo === 'ajuste') return valor;
  if (tipo === 'ingreso') return actual + valor;
  if (tipo === 'devolucion') return condicion === null ? null : condicion === 'buena' ? actual + valor : actual;
  return actual - valor;
}

function mensajeSimulado(movimiento: Movimiento): string {
  const donde = movimiento.tallaId === null ? 'el producto' : `la talla ${movimiento.talla}`;
  const total = unidades(movimiento.stockResultante);
  const resultado =
    movimiento.condicion === 'danada'
      ? `La prenda dañada no vuelve a la venta y ${donde} seguiría con ${total}.`
      : `Así quedaría ${donde}: ${total}.`;
  return `Prueba correcta. ${resultado} Como invitado, no se guarda.`;
}

export function FormularioMovimiento({ producto, alGuardar }: Props) {
  const { invitado } = useSesion();
  const [tallaId, setTallaId] = useState<number | null>(producto.tallas[0]?.tallaId ?? null);
  const [tipo, setTipo] = useState<TipoMovimiento>('ingreso');
  const [condicion, setCondicion] = useState<Condicion | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [exito, setExito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const talla = producto.tallas.find((t) => t.tallaId === tallaId) ?? producto.tallas[0];
  const actual = talla?.cantidad ?? 0;
  const enTalla = talla && talla.tallaId !== null ? ` en talla ${talla.talla}` : '';
  const esDevolucion = tipo === 'devolucion';
  const valor = cantidad === '' ? null : Number(cantidad);
  const valido = valor !== null && Number.isInteger(valor) && valor >= 0;
  const resultante = valido ? calcular(tipo, condicion, actual, valor) : null;
  const restaStock = tipo === 'despacho' || tipo === 'baja';
  const problema =
    !valido || valor === null
      ? null
      : restaStock && valor > actual
        ? `Solo ${quedan(actual)}${enTalla}.`
        : tipo !== 'ajuste' && valor === 0
          ? 'La cantidad debe ser mayor que cero.'
          : tipo === 'ajuste' && valor === actual
            ? 'El conteo es igual al stock actual.'
            : null;
  const listo = valido && !problema && motivo.trim().length >= 3 && (!esDevolucion || condicion !== null);

  function vistaPrevia(): string {
    if (problema) return problema;
    if (esDevolucion && condicion === null) return 'Elige el estado en que llegó la prenda.';
    if (resultante === null) return `Ahora hay ${unidades(actual)}${enTalla}.`;
    if (esDevolucion && condicion === 'danada') {
      return `No vuelve a la venta: el stock sigue en ${unidades(actual)}. Quedará registrada como prenda dañada.`;
    }
    return `Quedarán ${unidades(resultante)}.`;
  }

  function cambiarTipo(nuevo: TipoMovimiento) {
    setTipo(nuevo);
    setCondicion(null);
    setExito(null);
    setError(null);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!listo) return;
    setEnviando(true);
    setError(null);
    setErrores({});
    setExito(null);
    try {
      const movimiento = await pedir<Movimiento>('/movimientos', {
        metodo: 'POST',
        cuerpo: {
          productoId: producto.id,
          tallaId: talla?.tallaId ?? null,
          tipo,
          condicion: esDevolucion ? condicion : null,
          cantidad: valor,
          motivo: motivo.trim(),
        },
      });
      if (movimiento.simulado) {
        setExito(mensajeSimulado(movimiento));
        return;
      }
      setCantidad('');
      setMotivo('');
      setCondicion(null);
      const detalle =
        movimiento.condicion === 'danada'
          ? `Prenda dañada: no vuelve a la venta. Talla ${movimiento.talla}: ${quedan(movimiento.stockResultante)}.`
          : `Talla ${movimiento.talla}: ${quedan(movimiento.stockResultante)}.`;
      setExito(`${REGISTRADO[movimiento.tipo]} ${detalle}`);
      alGuardar(movimiento);
    } catch (causa) {
      if (causa instanceof ErrorApi) {
        setError(causa.message);
        setErrores(Object.fromEntries(causa.campos.map((c) => [c.campo, c.mensaje])));
      } else {
        setError('No se pudo guardar el movimiento');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate aria-labelledby="titulo-movimiento">
      <h2 id="titulo-movimiento">Registrar movimiento</h2>

      <fieldset>
        <legend>Tipo</legend>
        <div className="segmentos">
          {(Object.keys(TIPOS) as TipoMovimiento[]).map((opcion) => (
            <label key={opcion} className={`segmento ${tipo === opcion ? 'activo' : ''}`}>
              <input
                type="radio"
                name="tipo"
                value={opcion}
                checked={tipo === opcion}
                onChange={() => cambiarTipo(opcion)}
              />
              {TIPOS[opcion]}
            </label>
          ))}
        </div>
        <p className="ayuda">{AYUDAS[tipo]}</p>
      </fieldset>

      {esDevolucion && (
        <fieldset>
          <legend>Estado de la prenda</legend>
          <div className="segmentos">
            {(Object.keys(CONDICIONES) as Condicion[]).map((opcion) => (
              <label key={opcion} className={`segmento ${condicion === opcion ? 'activo' : ''}`}>
                <input
                  type="radio"
                  name="condicion"
                  value={opcion}
                  checked={condicion === opcion}
                  onChange={() => setCondicion(opcion)}
                />
                {CONDICIONES[opcion]}
              </label>
            ))}
          </div>
          {errores.condicion && <p className="ayuda ayuda-error">{errores.condicion}</p>}
        </fieldset>
      )}

      {producto.tallas.length > 1 && (
        <fieldset>
          <legend>Talla</legend>
          <div className="segmentos">
            {producto.tallas.map((opcion) => (
              <label key={opcion.tallaId ?? 'unica'} className={`segmento ${talla === opcion ? 'activo' : ''}`}>
                <input
                  type="radio"
                  name="talla"
                  checked={talla === opcion}
                  onChange={() => setTallaId(opcion.tallaId)}
                />
                {opcion.talla} <span className="tenue">({opcion.cantidad})</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label htmlFor="cantidad">{tipo === 'ajuste' ? 'Unidades contadas' : 'Cantidad'}</label>
      <input
        id="cantidad"
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        aria-invalid={Boolean(problema || errores.cantidad)}
        aria-describedby="vista-previa"
        required
      />
      <p id="vista-previa" className={`ayuda ${problema ? 'ayuda-error' : ''}`} aria-live="polite">
        {vistaPrevia()}
      </p>

      <label htmlFor="motivo">Motivo</label>
      <input
        id="motivo"
        list="motivos"
        maxLength={200}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        aria-invalid={Boolean(errores.motivo)}
        placeholder={`Ej.: ${MOTIVOS[tipo][0]}`}
        required
      />
      <datalist id="motivos">
        {MOTIVOS[tipo].map((opcion) => (
          <option key={opcion} value={opcion} />
        ))}
      </datalist>
      {errores.motivo && <p className="ayuda ayuda-error">{errores.motivo}</p>}

      {error && <Aviso>{error}</Aviso>}
      {exito && <Aviso tipo="exito">{exito}</Aviso>}

      <button type="submit" className="boton boton-oscuro" disabled={enviando || !listo}>
        {enviando ? 'Guardando…' : `${invitado ? 'Probar' : 'Registrar'} ${TIPOS[tipo].toLowerCase()} ↗`}
      </button>
    </form>
  );
}
