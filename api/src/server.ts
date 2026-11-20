import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApp } from './app.js';
import { leerConfig } from './config.js';
import { crearPool } from './db.js';
import { migrar } from './migrar.js';

const config = leerConfig();
const pool = crearPool(config.DATABASE_URL);
const aplicadas = await migrar(pool);
if (aplicadas.length) console.log(`Migraciones aplicadas: ${aplicadas.join(', ')}`);

const carpetaWeb = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
crearApp(pool, config, carpetaWeb).listen(config.PORT, () => {
  console.log(`VisagStock escuchando en el puerto ${config.PORT}`);
});
