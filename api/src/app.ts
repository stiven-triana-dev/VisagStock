import { existsSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { mismoOrigen } from './auth.js';
import type { Config } from './config.js';
import type { Pool } from './db.js';
import { ErrorNegocio } from './inventario.js';
import { rutasApi } from './rutas/api.js';

const POLITICA_CONTENIDO = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export function crearApp(pool: Pool, config: Config, carpetaWeb?: string) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': POLITICA_CONTENIDO,
    });
    next();
  });
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use('/api', mismoOrigen, (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', rutasApi(pool, config));
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  if (carpetaWeb && existsSync(path.join(carpetaWeb, 'index.html'))) {
    app.use(express.static(carpetaWeb, { index: false, maxAge: '7d' }));
    app.get('/{*ruta}', (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(carpetaWeb, 'index.html'));
    });
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Datos no válidos',
        campos: error.issues.map((issue) => ({ campo: issue.path.join('.'), mensaje: issue.message })),
      });
      return;
    }
    if (error instanceof ErrorNegocio) {
      res.status(error.estadoHttp).json({ error: error.message });
      return;
    }
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'JSON no válido' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Ocurrió un error inesperado' });
  });

  return app;
}
