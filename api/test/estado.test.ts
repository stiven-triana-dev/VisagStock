import { describe, expect, it } from 'vitest';
import { estadoDe, estadoProducto, type TallaStock } from '../src/inventario.js';

function talla(cantidad: number, minimo = 2): TallaStock {
  return { tallaId: 1, talla: 'M', cantidad, minimo, estado: estadoDe(cantidad, minimo) };
}

describe('estado del stock', () => {
  it('marca agotado, bajo y disponible según el mínimo', () => {
    expect(estadoDe(0, 2)).toBe('agotado');
    expect(estadoDe(2, 2)).toBe('bajo');
    expect(estadoDe(3, 2)).toBe('disponible');
    expect(estadoDe(1, 0)).toBe('disponible');
  });

  it('un producto está agotado solo si todas sus tallas lo están', () => {
    expect(estadoProducto([talla(0), talla(0)])).toBe('agotado');
    expect(estadoProducto([talla(0), talla(10)])).toBe('bajo');
    expect(estadoProducto([talla(5), talla(10)])).toBe('disponible');
  });
});
