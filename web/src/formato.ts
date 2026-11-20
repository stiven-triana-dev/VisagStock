import type { Condicion, Estado, TipoMovimiento } from './tipos';

const TIENDA = import.meta.env.VITE_TIENDA_URL ?? 'https://visagshop.onrender.com';

const numero = new Intl.NumberFormat('es-CO');
const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const fechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export const ESTADOS: Record<Estado, string> = {
  disponible: 'Disponible',
  bajo: 'Stock bajo',
  agotado: 'Agotado',
};

export const TIPOS: Record<TipoMovimiento, string> = {
  ingreso: 'Ingreso',
  despacho: 'Despacho',
  devolucion: 'Devolución',
  baja: 'Baja',
  ajuste: 'Ajuste',
};

export const CONDICIONES: Record<Condicion, string> = {
  buena: 'Buen estado',
  danada: 'Dañada',
};

export function unidades(cantidad: number): string {
  return `${numero.format(cantidad)} ${Math.abs(cantidad) === 1 ? 'unidad' : 'unidades'}`;
}

export function quedan(cantidad: number): string {
  return `${cantidad === 1 ? 'queda' : 'quedan'} ${unidades(cantidad)}`;
}

export function cifra(cantidad: number): string {
  return numero.format(cantidad);
}

export function cambio(cantidad: number): string {
  return cantidad > 0 ? `+${numero.format(cantidad)}` : numero.format(cantidad);
}

export function precio(valor: number | null): string {
  return valor === null ? 'Sin precio' : pesos.format(valor);
}

export function fecha(iso: string): string {
  return fechaHora.format(new Date(iso));
}

export function foto(imagen: string, miniatura = false): string {
  if (/^https?:\/\//.test(imagen)) return imagen;
  const ruta = imagen.replace(/^\/+/, '');
  const catalogo = /^img\/(p\d{3,})\.jpg$/.exec(ruta);
  const final = miniatura && catalogo ? `img/w/${catalogo[1]}-360.webp` : ruta;
  return new URL(final, `${TIENDA.replace(/\/+$/, '')}/`).toString();
}
