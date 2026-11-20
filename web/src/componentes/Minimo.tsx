import { useState, type FormEvent } from 'react';
import { pedir } from '../api';
import type { TallaStock } from '../tipos';

interface Props {
  productoId: string;
  talla: TallaStock;
  alGuardar: () => void;
}

export function Minimo({ productoId, talla, alGuardar }: Props) {
  const [valor, setValor] = useState(String(talla.minimo));
  const [estado, setEstado] = useState<'quieto' | 'guardando' | 'error'>('quieto');
  const numero = Number(valor);
  const cambiado = valor !== '' && Number.isInteger(numero) && numero >= 0 && numero !== talla.minimo;

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!cambiado) return;
    setEstado('guardando');
    try {
      await pedir('/minimos', { metodo: 'PUT', cuerpo: { productoId, tallaId: talla.tallaId, minimo: numero } });
      setEstado('quieto');
      alGuardar();
    } catch {
      setEstado('error');
    }
  }

  return (
    <form className="minimo" onSubmit={guardar}>
      <label className="sr-only" htmlFor={`minimo-${talla.tallaId ?? 'unica'}`}>
        Mínimo para la talla {talla.talla}
      </label>
      <input
        id={`minimo-${talla.tallaId ?? 'unica'}`}
        type="number"
        min={0}
        step={1}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        aria-invalid={estado === 'error'}
      />
      {cambiado && (
        <button type="submit" className="boton-enlace" disabled={estado === 'guardando'}>
          {estado === 'guardando' ? '…' : 'Guardar'}
        </button>
      )}
      {estado === 'error' && (
        <span className="ayuda-error" role="alert">
          No se guardó
        </span>
      )}
    </form>
  );
}
