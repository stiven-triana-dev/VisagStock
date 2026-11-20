import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { configPrueba, hayBase, prepararEntorno, type Entorno } from './ayuda.js';

describe.skipIf(!hayBase)('API de VisagStock', () => {
  let entorno: Entorno;
  let galleta: string;

  beforeAll(async () => {
    entorno = await prepararEntorno();
    const respuesta = await request(entorno.app)
      .post('/api/sesion')
      .send({ usuario: configPrueba.ADMIN_USERNAME, clave: configPrueba.ADMIN_PASSWORD });
    galleta = String(respuesta.headers['set-cookie']?.[0] ?? '').split(';')[0] ?? '';
  });

  afterAll(async () => {
    await entorno?.cerrar();
  });

  beforeEach(async () => {
    await entorno.reiniciar();
  });

  function mover(cuerpo: Record<string, unknown>) {
    return request(entorno.app).post('/api/movimientos').set('Cookie', galleta).send(cuerpo);
  }

  describe('sesión', () => {
    it('rechaza una clave incorrecta', async () => {
      const respuesta = await request(entorno.app)
        .post('/api/sesion')
        .send({ usuario: 'admin', clave: 'otra-clave-cualquiera' });
      expect(respuesta.status).toBe(401);
      expect(respuesta.headers['set-cookie']).toBeUndefined();
    });

    it('entrega una cookie httpOnly y estricta', async () => {
      const respuesta = await request(entorno.app)
        .post('/api/sesion')
        .send({ usuario: configPrueba.ADMIN_USERNAME, clave: configPrueba.ADMIN_PASSWORD });
      expect(respuesta.status).toBe(200);
      const cookie = String(respuesta.headers['set-cookie']?.[0]);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('pide sesión para ver el inventario', async () => {
      const respuesta = await request(entorno.app).get('/api/productos');
      expect(respuesta.status).toBe(401);
    });

    it('rechaza una cookie falsificada', async () => {
      const respuesta = await request(entorno.app).get('/api/productos').set('Cookie', 'visagstock_sesion=abc.def.ghi');
      expect(respuesta.status).toBe(401);
    });

    it('bloquea cambios que vienen de otro sitio', async () => {
      const respuesta = await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 1, motivo: 'Compra' }).set(
        'Origin',
        'https://sitio-malo.com',
      );
      expect(respuesta.status).toBe(403);
    });
  });

  describe('productos', () => {
    it('muestra cada producto con sus tallas y la talla única cuando no tiene', async () => {
      const respuesta = await request(entorno.app).get('/api/productos').set('Cookie', galleta);
      expect(respuesta.status).toBe(200);
      expect(respuesta.body.total).toBe(3);
      const camiseta = respuesta.body.productos.find((p: { id: string }) => p.id === 'p001');
      expect(camiseta.tallas.map((t: { talla: string }) => t.talla)).toEqual(['S', 'M', 'L']);
      expect(camiseta.estado).toBe('agotado');
      const gorra = respuesta.body.productos.find((p: { id: string }) => p.id === 'p003');
      expect(gorra.tallas).toEqual([{ tallaId: null, talla: 'Única', cantidad: 0, minimo: 2, estado: 'agotado' }]);
    });

    it('busca sin importar tildes ni mayúsculas', async () => {
      const respuesta = await request(entorno.app).get('/api/productos?buscar=PANTALON').set('Cookie', galleta);
      expect(respuesta.body.productos.map((p: { id: string }) => p.id)).toEqual(['p002']);
    });

    it('trata los comodines de la búsqueda como texto', async () => {
      const respuesta = await request(entorno.app).get('/api/productos?buscar=%25').set('Cookie', galleta);
      expect(respuesta.body.total).toBe(0);
    });

    it('filtra por estado', async () => {
      await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 10, motivo: 'Compra' });
      const respuesta = await request(entorno.app).get('/api/productos?estado=disponible').set('Cookie', galleta);
      expect(respuesta.body.productos.map((p: { id: string }) => p.id)).toEqual(['p003']);
    });

    it('responde 404 si el producto no existe', async () => {
      const respuesta = await request(entorno.app).get('/api/productos/p999').set('Cookie', galleta);
      expect(respuesta.status).toBe(404);
    });
  });

  describe('movimientos', () => {
    it('una devolución en buen estado vuelve a la venta', async () => {
      await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 2, motivo: 'Compra' });
      const devolucion = await mover({
        productoId: 'p003',
        tallaId: null,
        tipo: 'devolucion',
        condicion: 'buena',
        cantidad: 1,
        motivo: 'Cambio de talla',
      });
      expect(devolucion.status).toBe(201);
      expect(devolucion.body).toMatchObject({ condicion: 'buena', unidades: 1, cantidad: 1, stockResultante: 3 });
    });

    it('una devolución dañada queda registrada pero no vuelve a la venta', async () => {
      await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 2, motivo: 'Compra' });
      const devolucion = await mover({
        productoId: 'p003',
        tallaId: null,
        tipo: 'devolucion',
        condicion: 'danada',
        cantidad: 1,
        motivo: 'Costura rota',
      });
      expect(devolucion.status).toBe(201);
      expect(devolucion.body).toMatchObject({ condicion: 'danada', unidades: 1, cantidad: 0, stockResultante: 2 });
      const detalle = await request(entorno.app).get('/api/productos/p003').set('Cookie', galleta);
      expect(detalle.body.producto.total).toBe(2);
      expect(detalle.body.movimientos[0]).toMatchObject({ tipo: 'devolucion', condicion: 'danada' });
    });

    it('una devolución debe decir el estado de la prenda y los demás tipos no', async () => {
      const sinEstado = await mover({ productoId: 'p003', tallaId: null, tipo: 'devolucion', cantidad: 1, motivo: 'Cambio' });
      expect(sinEstado.status).toBe(400);
      expect(sinEstado.body.campos.map((c: { campo: string }) => c.campo)).toContain('condicion');
      const sobrante = await mover({
        productoId: 'p003',
        tallaId: null,
        tipo: 'ingreso',
        condicion: 'buena',
        cantidad: 1,
        motivo: 'Compra',
      });
      expect(sobrante.status).toBe(400);
    });

    it('una baja resta la prenda dañada en tienda y respeta el stock', async () => {
      await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 2, motivo: 'Compra' });
      const baja = await mover({ productoId: 'p003', tallaId: null, tipo: 'baja', cantidad: 1, motivo: 'Mancha de pintura' });
      expect(baja.body).toMatchObject({ tipo: 'baja', unidades: 1, cantidad: -1, stockResultante: 1 });
      const demasiado = await mover({ productoId: 'p003', tallaId: null, tipo: 'baja', cantidad: 3, motivo: 'Pérdida' });
      expect(demasiado.status).toBe(409);
    });

    it('un ingreso suma y queda en el historial', async () => {
      const respuesta = await mover({ productoId: 'p001', tallaId: 2, tipo: 'ingreso', cantidad: 12, motivo: 'Pedido al taller' });
      expect(respuesta.status).toBe(201);
      expect(respuesta.body).toMatchObject({ talla: 'M', tipo: 'ingreso', cantidad: 12, stockResultante: 12, usuario: 'admin' });
      const detalle = await request(entorno.app).get('/api/productos/p001').set('Cookie', galleta);
      expect(detalle.body.producto.total).toBe(12);
      expect(detalle.body.movimientos).toHaveLength(1);
    });

    it('un despacho resta y no deja el stock en negativo', async () => {
      await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 3, motivo: 'Compra' });
      const venta = await mover({ productoId: 'p003', tallaId: null, tipo: 'despacho', cantidad: 2, motivo: 'Venta en tienda' });
      expect(venta.body).toMatchObject({ cantidad: -2, stockResultante: 1 });
      const demasiado = await mover({ productoId: 'p003', tallaId: null, tipo: 'despacho', cantidad: 5, motivo: 'Venta' });
      expect(demasiado.status).toBe(409);
      expect(demasiado.body.error).toBe('No hay suficiente stock: quedan 1');
    });

    it('un ajuste deja el conteo exacto y guarda la diferencia', async () => {
      await mover({ productoId: 'p002', tallaId: 3, tipo: 'ingreso', cantidad: 10, motivo: 'Compra' });
      const ajuste = await mover({ productoId: 'p002', tallaId: 3, tipo: 'ajuste', cantidad: 7, motivo: 'Conteo físico' });
      expect(ajuste.body).toMatchObject({ cantidad: -3, stockResultante: 7 });
      const igual = await mover({ productoId: 'p002', tallaId: 3, tipo: 'ajuste', cantidad: 7, motivo: 'Conteo físico' });
      expect(igual.status).toBe(400);
    });

    it('valida la talla del producto', async () => {
      const sinTalla = await mover({ productoId: 'p001', tallaId: null, tipo: 'ingreso', cantidad: 1, motivo: 'Compra' });
      expect(sinTalla.status).toBe(400);
      const ajena = await mover({ productoId: 'p002', tallaId: 1, tipo: 'ingreso', cantidad: 1, motivo: 'Compra' });
      expect(ajena.status).toBe(400);
      expect(ajena.body.error).toBe('Esa talla no pertenece al producto');
    });

    it('rechaza datos mal formados con el detalle del campo', async () => {
      const respuesta = await mover({ productoId: 'p001', tallaId: 2, tipo: 'regalo', cantidad: -1, motivo: 'x' });
      expect(respuesta.status).toBe(400);
      const campos = respuesta.body.campos.map((c: { campo: string }) => c.campo);
      expect(campos).toEqual(expect.arrayContaining(['tipo', 'cantidad', 'motivo']));
    });

    it('aguanta despachos al mismo tiempo sin vender de más', async () => {
      await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 5, motivo: 'Compra' });
      const ventas = await Promise.all(
        Array.from({ length: 8 }, () => mover({ productoId: 'p003', tallaId: null, tipo: 'despacho', cantidad: 1, motivo: 'Venta' })),
      );
      expect(ventas.filter((v) => v.status === 201)).toHaveLength(5);
      expect(ventas.filter((v) => v.status === 409)).toHaveLength(3);
      const detalle = await request(entorno.app).get('/api/productos/p003').set('Cookie', galleta);
      expect(detalle.body.producto.total).toBe(0);
    });

    it('filtra el historial por producto y tipo', async () => {
      await mover({ productoId: 'p001', tallaId: 1, tipo: 'ingreso', cantidad: 4, motivo: 'Compra' });
      await mover({ productoId: 'p001', tallaId: 1, tipo: 'despacho', cantidad: 1, motivo: 'Venta' });
      await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 2, motivo: 'Compra' });
      const respuesta = await request(entorno.app)
        .get('/api/movimientos?productoId=p001&tipo=despacho')
        .set('Cookie', galleta);
      expect(respuesta.body.total).toBe(1);
      expect(respuesta.body.movimientos[0]).toMatchObject({ productoId: 'p001', tipo: 'despacho' });
    });
  });

  describe('mínimos y resumen', () => {
    it('cambiar el mínimo cambia el estado de la talla', async () => {
      await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 4, motivo: 'Compra' });
      const respuesta = await request(entorno.app)
        .put('/api/minimos')
        .set('Cookie', galleta)
        .send({ productoId: 'p003', tallaId: null, minimo: 5 });
      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toMatchObject({ cantidad: 4, minimo: 5, estado: 'bajo' });
    });

    it('el resumen cuenta unidades, alertas y movimientos de la semana', async () => {
      await mover({ productoId: 'p001', tallaId: 1, tipo: 'ingreso', cantidad: 10, motivo: 'Compra' });
      await mover({ productoId: 'p001', tallaId: 2, tipo: 'ingreso', cantidad: 10, motivo: 'Compra' });
      await mover({ productoId: 'p001', tallaId: 3, tipo: 'ingreso', cantidad: 10, motivo: 'Compra' });
      await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 3, motivo: 'Compra' });
      await mover({ productoId: 'p003', tallaId: null, tipo: 'despacho', cantidad: 1, motivo: 'Venta' });
      await mover({
        productoId: 'p003',
        tallaId: null,
        tipo: 'devolucion',
        condicion: 'danada',
        cantidad: 1,
        motivo: 'Cliente devolvió la gorra rota',
      });
      await mover({ productoId: 'p001', tallaId: 1, tipo: 'baja', cantidad: 1, motivo: 'Mancha en vitrina' });
      const respuesta = await request(entorno.app).get('/api/resumen').set('Cookie', galleta);
      expect(respuesta.body).toMatchObject({
        productos: 3,
        unidades: 31,
        agotados: 1,
        bajos: 1,
        ultimos7Dias: { movimientos: 7, ingresos: 33, despachos: 1, devoluciones: 1, danadas: 2 },
      });
      expect(respuesta.body.alertas.map((p: { id: string }) => p.id)).toEqual(['p003']);
      expect(respuesta.body.recientes).toHaveLength(5);
    });
  });

  it('responde 404 en JSON para rutas de la API que no existen', async () => {
    const respuesta = await request(entorno.app).get('/api/no-existe');
    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('Ruta no encontrada');
  });
  describe('invitado', () => {
    async function entrarComoInvitado() {
      const respuesta = await request(entorno.app).post('/api/sesion/invitado');
      expect(respuesta.status).toBe(200);
      return String(respuesta.headers['set-cookie']?.[0] ?? '').split(';')[0] ?? '';
    }

    it('avisa que la cuenta de invitado está activa', async () => {
      const respuesta = await request(entorno.app).get('/api/invitado');
      expect(respuesta.body).toEqual({ activo: true });
    });

    it('entra sin contraseña y la sesión dice que es invitado', async () => {
      const cookie = await entrarComoInvitado();
      const respuesta = await request(entorno.app).get('/api/sesion').set('Cookie', cookie);
      expect(respuesta.body).toEqual({ usuario: 'invitado', invitado: true });
    });

    it('prueba un movimiento completo pero no lo guarda', async () => {
      const cookie = await entrarComoInvitado();
      const respuesta = await request(entorno.app)
        .post('/api/movimientos')
        .set('Cookie', cookie)
        .send({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 5, motivo: 'Compra a proveedor' });
      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toMatchObject({ simulado: true, cantidad: 5, stockResultante: 5, usuario: 'invitado' });
      const detalle = await request(entorno.app).get('/api/productos/p003').set('Cookie', galleta);
      expect(detalle.body.producto.total).toBe(0);
      expect(detalle.body.movimientos).toEqual([]);
    });

    it('sigue validando el stock aunque no guarde', async () => {
      const cookie = await entrarComoInvitado();
      const respuesta = await request(entorno.app)
        .post('/api/movimientos')
        .set('Cookie', cookie)
        .send({ productoId: 'p003', tallaId: null, tipo: 'despacho', cantidad: 1, motivo: 'Venta en tienda' });
      expect(respuesta.status).toBe(409);
    });

    it('prueba el mínimo de una talla sin cambiarlo', async () => {
      const cookie = await entrarComoInvitado();
      const respuesta = await request(entorno.app)
        .put('/api/minimos')
        .set('Cookie', cookie)
        .send({ productoId: 'p003', tallaId: null, minimo: 7 });
      expect(respuesta.body).toMatchObject({ minimo: 7, simulado: true });
      const detalle = await request(entorno.app).get('/api/productos/p003').set('Cookie', galleta);
      expect(detalle.body.producto.tallas[0].minimo).toBe(2);
    });

    it('el administrador sí guarda y no queda marcado como simulado', async () => {
      const respuesta = await mover({ productoId: 'p003', tallaId: null, tipo: 'ingreso', cantidad: 2, motivo: 'Compra' });
      expect(respuesta.status).toBe(201);
      expect(respuesta.body.simulado).toBe(false);
    });

    it('no deja entrar como invitado si está desactivado', async () => {
      const app = crearApp(entorno.pool, { ...configPrueba, DEMO_ACTIVO: false });
      const respuesta = await request(app).post('/api/sesion/invitado');
      expect(respuesta.status).toBe(404);
      expect(respuesta.headers['set-cookie']).toBeUndefined();
    });
  });
});
