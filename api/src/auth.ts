import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Config } from './config.js';

export const COOKIE = 'visagstock_sesion';
const DURACION_HORAS = 8;

export const credenciales = z.object({
  usuario: z.string().trim().min(1).max(60),
  clave: z.string().min(1).max(200),
});

function iguales(a: string, b: string): boolean {
  const huellaA = createHash('sha256').update(a).digest();
  const huellaB = createHash('sha256').update(b).digest();
  return timingSafeEqual(huellaA, huellaB);
}

export function credencialesValidas(config: Config, usuario: string, clave: string): boolean {
  const usuarioOk = iguales(usuario, config.ADMIN_USERNAME);
  const claveOk = iguales(clave, config.ADMIN_PASSWORD);
  return usuarioOk && claveOk;
}

function opcionesCookie(config: Config) {
  return { httpOnly: true, sameSite: 'strict' as const, secure: config.NODE_ENV === 'production', path: '/' };
}

export function emitirSesion(res: Response, config: Config, usuario: string): void {
  const token = jwt.sign({ sub: usuario }, config.JWT_SECRETO, {
    algorithm: 'HS256',
    expiresIn: `${DURACION_HORAS}h`,
    issuer: 'visagstock',
  });
  res.cookie(COOKIE, token, { ...opcionesCookie(config), maxAge: DURACION_HORAS * 60 * 60 * 1000 });
}

export function cerrarSesion(res: Response, config: Config): void {
  res.clearCookie(COOKIE, opcionesCookie(config));
}

export function usuarioDeSesion(req: Request, config: Config): string | null {
  const token: unknown = req.cookies?.[COOKIE];
  if (typeof token !== 'string') return null;
  try {
    const datos = jwt.verify(token, config.JWT_SECRETO, { algorithms: ['HS256'], issuer: 'visagstock' });
    return typeof datos === 'object' && typeof datos.sub === 'string' ? datos.sub : null;
  } catch {
    return null;
  }
}

export function exigirSesion(config: Config) {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = usuarioDeSesion(req, config);
    if (!usuario) {
      res.status(401).json({ error: 'Inicia sesión para continuar' });
      return;
    }
    res.locals.usuario = usuario;
    next();
  };
}

export function mismoOrigen(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origen = req.get('origin');
  if (!origen) return next();
  let host = '';
  try {
    host = new URL(origen).host;
  } catch {
    host = '';
  }
  if (host !== req.get('host')) {
    res.status(403).json({ error: 'Origen no permitido' });
    return;
  }
  next();
}

export function limitarIntentos(maximo: number, ventanaMs: number) {
  const intentos = new Map<string, { cuenta: number; vence: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const ahora = Date.now();
    const clave = req.ip ?? 'desconocido';
    const registro = intentos.get(clave);
    const actual = !registro || registro.vence <= ahora ? { cuenta: 0, vence: ahora + ventanaMs } : registro;
    actual.cuenta += 1;
    intentos.set(clave, actual);
    if (actual.cuenta > maximo) {
      res.set('Retry-After', String(Math.ceil((actual.vence - ahora) / 1000)));
      res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
      return;
    }
    next();
  };
}
