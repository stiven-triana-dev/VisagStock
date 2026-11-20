import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { crearApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { crearPool, type Pool } from '../src/db.js';
import { migrar } from '../src/migrar.js';

const urlServidor = process.env.TEST_DATABASE_URL;
export const hayBase = Boolean(urlServidor);

export const configPrueba: Config = {
  DATABASE_URL: '',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'clave-de-prueba-123',
  JWT_SECRETO: 'secreto-de-prueba-con-mas-de-32-caracteres',
  PORT: 0,
  NODE_ENV: 'test',
};

async function conAdministrador(trabajo: (cliente: pg.Client) => Promise<void>) {
  const cliente = new pg.Client({ connectionString: urlServidor });
  await cliente.connect();
  try {
    await trabajo(cliente);
  } finally {
    await cliente.end();
  }
}

export interface Entorno {
  pool: Pool;
  app: ReturnType<typeof crearApp>;
  reiniciar: () => Promise<void>;
  cerrar: () => Promise<void>;
}

export async function prepararEntorno(): Promise<Entorno> {
  const nombre = `visagstock_prueba_${randomBytes(4).toString('hex')}`;
  await conAdministrador(async (cliente) => {
    await cliente.query(`CREATE DATABASE ${nombre} TEMPLATE template0 ENCODING 'UTF8'`);
  });
  const url = new URL(urlServidor ?? '');
  url.pathname = `/${nombre}`;
  const pool = crearPool(url.toString());
  const carpeta = path.dirname(fileURLToPath(import.meta.url));
  await pool.query(await readFile(path.join(carpeta, 'fixtures', 'visagshop.sql'), 'utf8'));
  await migrar(pool);
  return {
    pool,
    app: crearApp(pool, { ...configPrueba, DATABASE_URL: url.toString() }),
    reiniciar: async () => {
      await pool.query('TRUNCATE inventario.movimientos, inventario.existencias RESTART IDENTITY');
    },
    cerrar: async () => {
      await pool.end();
      await conAdministrador(async (cliente) => {
        await cliente.query(`DROP DATABASE IF EXISTS ${nombre} WITH (FORCE)`);
      });
    },
  };
}
