import { useState, type FormEvent } from 'react';
import { pedir } from '../api';
import type { TallaStock } from '../tipos';

type EstadoMinimo = 'quieto' | 'guardando' | 'error' | 'simulado';

interface Props {
  productoId: string;
  talla: TallaStock;
  alGuardar: () => void;
}

export function Minimo({ productoId, talla, alGuardar }: Props) {
  const [valor, setValor] = useState(String(talla.minimo));
  const [estado, setEstado] = useState<EstadoMinimo>('quieto');
  const numero = Number(valor);
  const cambiado = valor !== '' && Number.isInteger(numero) && numero >= 0 && numero !== talla.minimo;

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!cambiado) return;
    setEstado('guardando');
    try {
      const respuesta = await pedir<{ simulado: boolean }>('/minimos', {
        metodo: 'PUT',
        cuerpo: { productoId, tallaId: talla.tallaId, minimo: numero },
      });
      if (respuesta.simulado) {
        setEstado('simulado');
        return;
      }
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
        onChange={(e) => {
          setValor(e.target.value);
          setEstado('quieto');
        }}
        aria-invalid={estado === 'error'}
      />
      {cambiado && estado !== 'simulado' && (
        <button type="submit" className="boton-enlace" disabled={estado === 'guardando'}>
          {estado === 'guardando' ? '…' : 'Guardar'}
        </button>
      )}
      {estado === 'simulado' && (
        <span className="ayuda" role="status">
          Prueba correcta: no se guarda
        </span>
      )}
      {estado === 'error' && (
        <span className="ayuda-error" role="alert">
          No se guardó
        </span>
      )}
    </form>
  );
}
