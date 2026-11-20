import { describe, expect, it } from 'vitest';
import { cambio, foto, quedan, unidades } from '../formato';

describe('formato', () => {
  it('usa la miniatura WebP de la tienda para las fotos del catálogo', () => {
    expect(foto('/img/p001.jpg', true)).toBe('https://visagshop.onrender.com/img/w/p001-360.webp');
    expect(foto('/img/p001.jpg')).toBe('https://visagshop.onrender.com/img/p001.jpg');
  });

  it('respeta las fotos subidas y las direcciones completas', () => {
    expect(foto('/uploads/abc.webp', true)).toBe('https://visagshop.onrender.com/uploads/abc.webp');
    expect(foto('https://cdn.ejemplo.com/a.jpg', true)).toBe('https://cdn.ejemplo.com/a.jpg');
  });

  it('escribe unidades y cambios en español', () => {
    expect(unidades(1)).toBe('1 unidad');
    expect(unidades(1200)).toBe('1.200 unidades');
    expect(cambio(5)).toBe('+5');
    expect(cambio(-3)).toBe('-3');
  });
});

describe('quedan', () => {
  it('concuerda el verbo con la cantidad', () => {
    expect(quedan(1)).toBe('queda 1 unidad');
    expect(quedan(0)).toBe('quedan 0 unidades');
    expect(quedan(4)).toBe('quedan 4 unidades');
  });
});
