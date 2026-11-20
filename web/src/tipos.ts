export type Estado = 'agotado' | 'bajo' | 'disponible';
export type TipoMovimiento = 'ingreso' | 'despacho' | 'devolucion' | 'baja' | 'ajuste';
export type Condicion = 'buena' | 'danada';

export interface TallaStock {
  tallaId: number | null;
  talla: string;
  cantidad: number;
  minimo: number;
  estado: Estado;
}

export interface ProductoStock {
  id: string;
  nombre: string;
  categoria: string;
  imagen: string;
  precio: number | null;
  tallas: TallaStock[];
  total: number;
  estado: Estado;
}

export interface Movimiento {
  id: number;
  productoId: string;
  producto: string;
  tallaId: number | null;
  talla: string;
  tipo: TipoMovimiento;
  condicion: Condicion | null;
  unidades: number;
  cantidad: number;
  stockResultante: number;
  motivo: string;
  usuario: string;
  fecha: string;
  simulado?: boolean;
}

export interface Pagina {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ListaProductos extends Pagina {
  productos: ProductoStock[];
}

export interface ListaMovimientos extends Pagina {
  movimientos: Movimiento[];
}

export interface DetalleProducto {
  producto: ProductoStock;
  movimientos: Movimiento[];
}

export interface Resumen {
  productos: number;
  unidades: number;
  agotados: number;
  bajos: number;
  ultimos7Dias: { movimientos: number; ingresos: number; despachos: number; devoluciones: number; danadas: number };
  alertas: ProductoStock[];
  recientes: Movimiento[];
}
