import pg from 'pg';

export type Pool = pg.Pool;
export type Cliente = pg.PoolClient;

export function crearPool(url: string): pg.Pool {
  return new pg.Pool({ connectionString: url, max: 5, idleTimeoutMillis: 60_000 });
}

export async function enTransaccion<T>(
  pool: pg.Pool,
  trabajo: (cliente: pg.PoolClient) => Promise<T>,
  simular = false,
): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query(simular ? 'ROLLBACK' : 'COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
