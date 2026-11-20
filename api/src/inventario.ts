import { z } from 'zod';
import { enTransaccion, type Cliente, type Pool } from './db.js';

export type Estado = 'agotado' | 'bajo' | 'disponible';
export type TipoMovimiento = 'ingreso' | 'despacho' | 'devolucion' | 'baja' | 'ajuste';
export type Condicion = 'buena' | 'danada';
const TIPOS = ['ingreso', 'despacho', 'devolucion', 'baja', 'ajuste'] as const;

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
}

export class ErrorNegocio extends Error {
  constructor(
    readonly estadoHttp: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export const TALLA_UNICA = 'Única';
const MINIMO_INICIAL = 2;

export function estadoDe(cantidad: number, minimo: number): Estado {
  if (cantidad === 0) return 'agotado';
  if (cantidad <= minimo) return 'bajo';
  return 'disponible';
}

export function estadoProducto(tallas: TallaStock[]): Estado {
  if (tallas.every((talla) => talla.estado === 'agotado')) return 'agotado';
  if (tallas.some((talla) => talla.estado !== 'disponible')) return 'bajo';
  return 'disponible';
}

export const filtrosProductos = z.object({
  buscar: z.string().trim().max(80).optional(),
  categoria: z.string().trim().max(70).optional(),
  estado: z.enum(['agotado', 'bajo', 'disponible']).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(24),
});
export type FiltrosProductos = z.infer<typeof filtrosProductos>;

export const nuevoMovimiento = z
  .object({
    productoId: z.string().regex(/^p\d{3,}$/),
    tallaId: z.number().int().positive().nullable(),
    tipo: z.enum(TIPOS),
    condicion: z.enum(['buena', 'danada']).nullable().default(null),
    cantidad: z.number().int().min(0).max(100_000),
    motivo: z.string().trim().min(3).max(200),
  })
  .refine((datos) => (datos.tipo === 'devolucion') === (datos.condicion !== null), {
    path: ['condicion'],
    message: 'Indica si la prenda devuelta está en buen estado o dañada (solo para devoluciones)',
  });
export type NuevoMovimiento = z.infer<typeof nuevoMovimiento>;

export const filtrosMovimientos = z.object({
  productoId: z.string().regex(/^p\d{3,}$/).optional(),
  tipo: z.enum(TIPOS).optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(30),
});
export type FiltrosMovimientos = z.infer<typeof filtrosMovimientos>;

interface FilaStock {
  id: string;
  nombre: string;
  categoria: string;
  imagen: string;
  precio: number | null;
  talla_id: number | null;
  talla: string | null;
  cantidad: number;
  minimo: number;
}

const SIN_TILDES = ['áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'] as const;

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

async function filasStock(db: Pool | Cliente, condicion: string, parametros: unknown[]): Promise<FilaStock[]> {
  const { rows } = await db.query<FilaStock>(
    `SELECT p.id, p.name AS nombre, c.name AS categoria, p.image AS imagen, p.price AS precio,
            ps.size_id AS talla_id, s.name AS talla,
            COALESCE(e.cantidad, 0) AS cantidad, COALESCE(e.minimo, ${MINIMO_INICIAL}) AS minimo
       FROM public.products p
       JOIN public.categories c ON c.id = p.category_id
       LEFT JOIN public.product_sizes ps ON ps.product_id = p.id
       LEFT JOIN public.sizes s ON s.id = ps.size_id
       LEFT JOIN inventario.existencias e ON e.producto_id = p.id AND e.talla_id IS NOT DISTINCT FROM ps.size_id
      ${condicion}
      ORDER BY p.id, ps.position NULLS FIRST, s.name`,
    parametros,
  );
  return rows;
}

function agrupar(filas: FilaStock[]): ProductoStock[] {
  const productos = new Map<string, ProductoStock>();
  for (const fila of filas) {
    let producto = productos.get(fila.id);
    if (!producto) {
      producto = {
        id: fila.id,
        nombre: fila.nombre,
        categoria: fila.categoria,
        imagen: fila.imagen,
        precio: fila.precio,
        tallas: [],
        total: 0,
        estado: 'agotado',
      };
      productos.set(fila.id, producto);
    }
    producto.tallas.push({
      tallaId: fila.talla_id,
      talla: fila.talla ?? TALLA_UNICA,
      cantidad: fila.cantidad,
      minimo: fila.minimo,
      estado: estadoDe(fila.cantidad, fila.minimo),
    });
  }
  for (const producto of productos.values()) {
    producto.total = producto.tallas.reduce((suma, talla) => suma + talla.cantidad, 0);
    producto.estado = estadoProducto(producto.tallas);
  }
  return [...productos.values()];
}

export async function todosLosProductos(db: Pool | Cliente): Promise<ProductoStock[]> {
  return agrupar(await filasStock(db, '', []));
}

export async function listarProductos(pool: Pool, filtros: FiltrosProductos) {
  const condiciones: string[] = [];
  const parametros: unknown[] = [];
  if (filtros.categoria) {
    parametros.push(normalizar(filtros.categoria));
    condiciones.push(`translate(lower(c.name), '${SIN_TILDES[0]}', '${SIN_TILDES[1]}') = $${parametros.length}`);
  }
  for (const palabra of normalizar(filtros.buscar ?? '').split(/\s+/).filter(Boolean).slice(0, 5)) {
    parametros.push(`%${palabra.replace(/[\\%_]/g, '\\$&')}%`);
    condiciones.push(
      `translate(lower(p.name || ' ' || c.name), '${SIN_TILDES[0]}', '${SIN_TILDES[1]}') LIKE $${parametros.length}`,
    );
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  let productos = agrupar(await filasStock(pool, where, parametros));
  if (filtros.estado) productos = productos.filter((producto) => producto.estado === filtros.estado);
  const inicio = (filtros.pagina - 1) * filtros.porPagina;
  return {
    total: productos.length,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
    productos: productos.slice(inicio, inicio + filtros.porPagina),
  };
}

const SELECT_MOVIMIENTOS = `
  SELECT m.id::int AS id, e.producto_id AS "productoId", p.name AS producto, e.talla_id AS "tallaId",
         COALESCE(s.name, '${TALLA_UNICA}') AS talla, m.tipo, m.condicion, m.unidades, m.cantidad, m.stock_resultante AS "stockResultante",
         m.motivo, m.usuario, m.fecha
    FROM inventario.movimientos m
    JOIN inventario.existencias e ON e.id = m.existencia_id
    JOIN public.products p ON p.id = e.producto_id
    LEFT JOIN public.sizes s ON s.id = e.talla_id`;

export async function detalleProducto(pool: Pool, id: string) {
  const [producto] = agrupar(await filasStock(pool, 'WHERE p.id = $1', [id]));
  if (!producto) throw new ErrorNegocio(404, 'Producto no encontrado');
  const { rows } = await pool.query<Movimiento>(
    `${SELECT_MOVIMIENTOS} WHERE e.producto_id = $1 ORDER BY m.fecha DESC, m.id DESC LIMIT 20`,
    [id],
  );
  return { producto, movimientos: rows };
}

async function existenciaBloqueada(cliente: Cliente, productoId: string, tallaId: number | null) {
  const { rows: tallas } = await cliente.query<{ size_id: number }>(
    'SELECT size_id FROM public.product_sizes WHERE product_id = $1',
    [productoId],
  );
  const { rowCount } = await cliente.query('SELECT 1 FROM public.products WHERE id = $1', [productoId]);
  if (!rowCount) throw new ErrorNegocio(404, 'Producto no encontrado');
  if (tallaId === null && tallas.length > 0) throw new ErrorNegocio(400, 'Elige una talla de este producto');
  if (tallaId !== null && !tallas.some((talla) => talla.size_id === tallaId)) {
    throw new ErrorNegocio(400, 'Esa talla no pertenece al producto');
  }
  await cliente.query(
    `INSERT INTO inventario.existencias (producto_id, talla_id, minimo) VALUES ($1, $2, ${MINIMO_INICIAL})
     ON CONFLICT (producto_id, talla_id) DO NOTHING`,
    [productoId, tallaId],
  );
  const { rows } = await cliente.query<{ id: number; cantidad: number }>(
    `SELECT id, cantidad FROM inventario.existencias
      WHERE producto_id = $1 AND talla_id IS NOT DISTINCT FROM $2 FOR UPDATE`,
    [productoId, tallaId],
  );
  const existencia = rows[0];
  if (!existencia) throw new ErrorNegocio(500, 'No se pudo leer el stock');
  return existencia;
}

function calcularCambio(datos: NuevoMovimiento, actual: number): number {
  const { tipo, cantidad } = datos;
  if (tipo === 'ajuste') {
    if (cantidad === actual) throw new ErrorNegocio(400, 'El conteo es igual al stock actual');
    return cantidad - actual;
  }
  if (cantidad === 0) throw new ErrorNegocio(400, 'La cantidad debe ser mayor que cero');
  if (tipo === 'ingreso') return cantidad;
  if (tipo === 'devolucion') return datos.condicion === 'buena' ? cantidad : 0;
  if (cantidad > actual) throw new ErrorNegocio(409, `No hay suficiente stock: quedan ${actual}`);
  return -cantidad;
}

export async function registrarMovimiento(pool: Pool, datos: NuevoMovimiento, usuario: string): Promise<Movimiento> {
  return enTransaccion(pool, async (cliente) => {
    const existencia = await existenciaBloqueada(cliente, datos.productoId, datos.tallaId);
    const cambio = calcularCambio(datos, existencia.cantidad);
    const resultante = existencia.cantidad + cambio;
    await cliente.query('UPDATE inventario.existencias SET cantidad = $1, actualizado = NOW() WHERE id = $2', [
      resultante,
      existencia.id,
    ]);
    const { rows } = await cliente.query<{ id: number }>(
      `INSERT INTO inventario.movimientos
         (existencia_id, tipo, condicion, unidades, cantidad, stock_resultante, motivo, usuario)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id::int AS id`,
      [existencia.id, datos.tipo, datos.condicion, datos.cantidad, cambio, resultante, datos.motivo, usuario],
    );
    const { rows: movimientos } = await cliente.query<Movimiento>(`${SELECT_MOVIMIENTOS} WHERE m.id = $1`, [
      rows[0]?.id,
    ]);
    const movimiento = movimientos[0];
    if (!movimiento) throw new ErrorNegocio(500, 'No se pudo registrar el movimiento');
    return movimiento;
  });
}

export const nuevoMinimo = z.object({
  productoId: z.string().regex(/^p\d{3,}$/),
  tallaId: z.number().int().positive().nullable(),
  minimo: z.number().int().min(0).max(10_000),
});

export async function cambiarMinimo(pool: Pool, datos: z.infer<typeof nuevoMinimo>): Promise<TallaStock> {
  return enTransaccion(pool, async (cliente) => {
    const existencia = await existenciaBloqueada(cliente, datos.productoId, datos.tallaId);
    await cliente.query('UPDATE inventario.existencias SET minimo = $1, actualizado = NOW() WHERE id = $2', [
      datos.minimo,
      existencia.id,
    ]);
    const [producto] = agrupar(await filasStock(cliente, 'WHERE p.id = $1', [datos.productoId]));
    const talla = producto?.tallas.find((t) => t.tallaId === datos.tallaId);
    if (!talla) throw new ErrorNegocio(500, 'No se pudo leer el stock');
    return talla;
  });
}

export async function listarMovimientos(pool: Pool, filtros: FiltrosMovimientos) {
  const condiciones: string[] = [];
  const parametros: unknown[] = [];
  if (filtros.productoId) {
    parametros.push(filtros.productoId);
    condiciones.push(`e.producto_id = $${parametros.length}`);
  }
  if (filtros.tipo) {
    parametros.push(filtros.tipo);
    condiciones.push(`m.tipo = $${parametros.length}`);
  }
  if (filtros.desde) {
    parametros.push(filtros.desde);
    condiciones.push(`m.fecha >= $${parametros.length}::date`);
  }
  if (filtros.hasta) {
    parametros.push(filtros.hasta);
    condiciones.push(`m.fecha < $${parametros.length}::date + 1`);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows: conteo } = await pool.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM inventario.movimientos m
       JOIN inventario.existencias e ON e.id = m.existencia_id ${where}`,
    parametros,
  );
  const desplazamiento = (filtros.pagina - 1) * filtros.porPagina;
  const { rows } = await pool.query<Movimiento>(
    `${SELECT_MOVIMIENTOS} ${where} ORDER BY m.fecha DESC, m.id DESC
      LIMIT ${filtros.porPagina} OFFSET ${desplazamiento}`,
    parametros,
  );
  return { total: conteo[0]?.total ?? 0, pagina: filtros.pagina, porPagina: filtros.porPagina, movimientos: rows };
}

interface Semana {
  movimientos: number;
  ingresos: number;
  despachos: number;
  devoluciones: number;
  danadas: number;
}

export async function resumen(pool: Pool) {
  const productos = await todosLosProductos(pool);
  const { rows } = await pool.query<Semana>(
    `SELECT count(*)::int AS movimientos,
            COALESCE(sum(unidades) FILTER (WHERE tipo = 'ingreso'), 0)::int AS ingresos,
            COALESCE(sum(unidades) FILTER (WHERE tipo = 'despacho'), 0)::int AS despachos,
            COALESCE(sum(unidades) FILTER (WHERE tipo = 'devolucion'), 0)::int AS devoluciones,
            COALESCE(sum(unidades) FILTER (WHERE tipo = 'baja' OR condicion = 'danada'), 0)::int AS danadas
       FROM inventario.movimientos WHERE fecha >= NOW() - INTERVAL '7 days'`,
  );
  const { rows: recientes } = await pool.query<Movimiento>(
    `${SELECT_MOVIMIENTOS} ORDER BY m.fecha DESC, m.id DESC LIMIT 5`,
  );
  const ultimos7Dias = rows[0] ?? { movimientos: 0, ingresos: 0, despachos: 0, devoluciones: 0, danadas: 0 };
  return {
    productos: productos.length,
    unidades: productos.reduce((suma, producto) => suma + producto.total, 0),
    agotados: productos.filter((producto) => producto.estado === 'agotado').length,
    bajos: productos.filter((producto) => producto.estado === 'bajo').length,
    ultimos7Dias,
    alertas: productos
      .filter((producto) => producto.estado !== 'disponible' && producto.total > 0)
      .sort((a, b) => a.total - b.total)
      .slice(0, 8),
    recientes,
  };
}
