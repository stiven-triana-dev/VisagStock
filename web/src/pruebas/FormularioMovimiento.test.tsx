import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormularioMovimiento } from '../componentes/FormularioMovimiento';
import type { Movimiento, ProductoStock } from '../tipos';

const producto: ProductoStock = {
  id: 'p010',
  nombre: 'Camiseta Oversize',
  categoria: 'Camisetas',
  imagen: '/img/p010.jpg',
  precio: 59000,
  total: 7,
  estado: 'disponible',
  tallas: [
    { tallaId: 1, talla: 'S', cantidad: 2, minimo: 2, estado: 'bajo' },
    { tallaId: 2, talla: 'M', cantidad: 5, minimo: 2, estado: 'disponible' },
  ],
};

function movimiento(datos: Partial<Movimiento>): Movimiento {
  return {
    id: 1,
    productoId: 'p010',
    producto: 'Camiseta Oversize',
    tallaId: 2,
    talla: 'M',
    tipo: 'ingreso',
    condicion: null,
    unidades: 1,
    cantidad: 1,
    stockResultante: 6,
    motivo: 'Compra a proveedor',
    usuario: 'admin',
    fecha: '2026-11-19T10:00:00Z',
    ...datos,
  };
}

function responder(estado: number, cuerpo: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  );
}

function cuerpoEnviado(pedido: ReturnType<typeof responder>) {
  const [, opciones] = pedido.mock.calls[0] ?? [];
  return JSON.parse(String(opciones?.body)) as unknown;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FormularioMovimiento', () => {
  it('muestra cuánto quedará antes de registrar', async () => {
    const usuario = userEvent.setup();
    render(<FormularioMovimiento producto={producto} alGuardar={() => undefined} />);
    await usuario.click(screen.getByRole('radio', { name: /^M/ }));
    await usuario.type(screen.getByLabelText('Cantidad'), '4');
    expect(screen.getByText('Quedarán 9 unidades.')).toBeInTheDocument();
  });

  it('no deja despachar más unidades de las que hay', async () => {
    const usuario = userEvent.setup();
    const pedido = responder(201, {});
    render(<FormularioMovimiento producto={producto} alGuardar={() => undefined} />);
    await usuario.click(screen.getByLabelText('Despacho'));
    await usuario.type(screen.getByLabelText('Cantidad'), '3');
    await usuario.type(screen.getByLabelText('Motivo'), 'Venta en tienda');
    expect(screen.getByText('Solo quedan 2 unidades en talla S.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar despacho/i })).toBeDisabled();
    expect(pedido).not.toHaveBeenCalled();
  });

  it('una baja tampoco puede superar el stock', async () => {
    const usuario = userEvent.setup();
    render(<FormularioMovimiento producto={producto} alGuardar={() => undefined} />);
    await usuario.click(screen.getByLabelText('Baja'));
    await usuario.type(screen.getByLabelText('Cantidad'), '5');
    expect(screen.getByText('Solo quedan 2 unidades en talla S.')).toBeInTheDocument();
  });

  it('una devolución pide el estado de la prenda antes de registrarse', async () => {
    const usuario = userEvent.setup();
    render(<FormularioMovimiento producto={producto} alGuardar={() => undefined} />);
    await usuario.click(screen.getByLabelText('Devolución'));
    await usuario.type(screen.getByLabelText('Cantidad'), '1');
    await usuario.type(screen.getByLabelText('Motivo'), 'Cambio de talla');
    expect(screen.getByText('Elige el estado en que llegó la prenda.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar devolución/i })).toBeDisabled();
    await usuario.click(screen.getByLabelText('Buen estado'));
    expect(screen.getByText('Quedarán 3 unidades.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar devolución/i })).toBeEnabled();
  });

  it('una devolución dañada no vuelve a la venta', async () => {
    const usuario = userEvent.setup();
    const pedido = responder(
      201,
      movimiento({ tipo: 'devolucion', condicion: 'danada', cantidad: 0, stockResultante: 5, motivo: 'Costura rota' }),
    );
    render(<FormularioMovimiento producto={producto} alGuardar={() => undefined} />);
    await usuario.click(screen.getByLabelText('Devolución'));
    await usuario.click(screen.getByLabelText('Dañada'));
    await usuario.click(screen.getByRole('radio', { name: /^M/ }));
    await usuario.type(screen.getByLabelText('Cantidad'), '1');
    expect(
      screen.getByText('No vuelve a la venta: el stock sigue en 5 unidades. Quedará registrada como prenda dañada.'),
    ).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Motivo'), 'Costura rota');
    await usuario.click(screen.getByRole('button', { name: /registrar devolución/i }));

    expect(
      await screen.findByText('Devolución registrada. Prenda dañada: no vuelve a la venta. Talla M: quedan 5 unidades.'),
    ).toBeInTheDocument();
    expect(cuerpoEnviado(pedido)).toEqual({
      productoId: 'p010',
      tallaId: 2,
      tipo: 'devolucion',
      condicion: 'danada',
      cantidad: 1,
      motivo: 'Costura rota',
    });
  });

  it('registra un ajuste y avisa cuando se guarda', async () => {
    const usuario = userEvent.setup();
    const alGuardar = vi.fn();
    const pedido = responder(
      201,
      movimiento({ tipo: 'ajuste', unidades: 4, cantidad: -1, stockResultante: 4, motivo: 'Conteo físico' }),
    );
    render(<FormularioMovimiento producto={producto} alGuardar={alGuardar} />);
    await usuario.click(screen.getByLabelText('Ajuste'));
    await usuario.click(screen.getByRole('radio', { name: /^M/ }));
    await usuario.type(screen.getByLabelText('Unidades contadas'), '4');
    await usuario.type(screen.getByLabelText('Motivo'), 'Conteo físico');
    await usuario.click(screen.getByRole('button', { name: /registrar ajuste/i }));

    expect(await screen.findByText('Ajuste registrado. Talla M: quedan 4 unidades.')).toBeInTheDocument();
    expect(alGuardar).toHaveBeenCalledOnce();
    expect(cuerpoEnviado(pedido)).toEqual({
      productoId: 'p010',
      tallaId: 2,
      tipo: 'ajuste',
      condicion: null,
      cantidad: 4,
      motivo: 'Conteo físico',
    });
  });

  it('muestra el error que responde la API', async () => {
    const usuario = userEvent.setup();
    responder(409, { error: 'No hay suficiente stock: quedan 1' });
    render(<FormularioMovimiento producto={producto} alGuardar={() => undefined} />);
    await usuario.click(screen.getByLabelText('Despacho'));
    await usuario.type(screen.getByLabelText('Cantidad'), '1');
    await usuario.type(screen.getByLabelText('Motivo'), 'Venta en tienda');
    await usuario.click(screen.getByRole('button', { name: /registrar despacho/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay suficiente stock: quedan 1');
  });
});
