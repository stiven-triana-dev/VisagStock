import { Router } from 'express';
import type { Config } from '../config.js';
import type { Pool } from '../db.js';
import {
  cerrarSesion,
  credenciales,
  credencialesValidas,
  emitirSesion,
  exigirSesion,
  limitarIntentos,
  usuarioDeSesion,
} from '../auth.js';
import {
  cambiarMinimo,
  detalleProducto,
  filtrosMovimientos,
  filtrosProductos,
  listarMovimientos,
  listarProductos,
  nuevoMinimo,
  nuevoMovimiento,
  registrarMovimiento,
  resumen,
} from '../inventario.js';

export function rutasApi(pool: Pool, config: Config): Router {
  const api = Router();
  const sesion = exigirSesion(config);

  api.get('/estado', (_req, res) => {
    res.json({ estado: 'ok' });
  });

  api.post('/sesion', limitarIntentos(10, 15 * 60 * 1000), (req, res) => {
    const { usuario, clave } = credenciales.parse(req.body);
    if (!credencialesValidas(config, usuario, clave)) {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      return;
    }
    emitirSesion(res, config, usuario);
    res.json({ usuario });
  });

  api.get('/sesion', (req, res) => {
    const usuario = usuarioDeSesion(req, config);
    if (!usuario) {
      res.status(401).json({ error: 'Sin sesión' });
      return;
    }
    res.json({ usuario });
  });

  api.delete('/sesion', (_req, res) => {
    cerrarSesion(res, config);
    res.status(204).end();
  });

  api.get('/resumen', sesion, async (_req, res) => {
    res.json(await resumen(pool));
  });

  api.get('/productos', sesion, async (req, res) => {
    res.json(await listarProductos(pool, filtrosProductos.parse(req.query)));
  });

  api.get('/productos/:id', sesion, async (req, res) => {
    res.json(await detalleProducto(pool, String(req.params.id)));
  });

  api.get('/movimientos', sesion, async (req, res) => {
    res.json(await listarMovimientos(pool, filtrosMovimientos.parse(req.query)));
  });

  api.post('/movimientos', sesion, async (req, res) => {
    const movimiento = await registrarMovimiento(pool, nuevoMovimiento.parse(req.body), String(res.locals.usuario));
    res.status(201).json(movimiento);
  });

  api.put('/minimos', sesion, async (req, res) => {
    res.json(await cambiarMinimo(pool, nuevoMinimo.parse(req.body)));
  });

  return api;
}
