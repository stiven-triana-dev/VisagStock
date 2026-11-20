import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crearPool, enTransaccion, type Pool } from './db.js';

const carpeta = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migraciones');
const BLOQUEO = 7_150_221;

export async function migrar(pool: Pool): Promise<string[]> {
  const archivos = (await readdir(carpeta)).filter((nombre) => nombre.endsWith('.sql')).sort();
  return enTransaccion(pool, async (cliente) => {
    await cliente.query('SELECT pg_advisory_xact_lock($1)', [BLOQUEO]);
    await cliente.query('CREATE SCHEMA IF NOT EXISTS inventario');
    await cliente.query(
      'CREATE TABLE IF NOT EXISTS inventario.migraciones (nombre TEXT PRIMARY KEY, aplicada TIMESTAMPTZ NOT NULL DEFAULT NOW())',
    );
    const { rows } = await cliente.query<{ nombre: string }>('SELECT nombre FROM inventario.migraciones');
    const hechas = new Set(rows.map((fila) => fila.nombre));
    const aplicadas: string[] = [];
    for (const archivo of archivos) {
      if (hechas.has(archivo)) continue;
      await cliente.query(await readFile(path.join(carpeta, archivo), 'utf8'));
      await cliente.query('INSERT INTO inventario.migraciones (nombre) VALUES ($1)', [archivo]);
      aplicadas.push(archivo);
    }
    return aplicadas;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Define DATABASE_URL');
  const pool = crearPool(url);
  const aplicadas = await migrar(pool);
  console.log(aplicadas.length ? `Migraciones aplicadas: ${aplicadas.join(', ')}` : 'La base ya estaba al día');
  await pool.end();
}
