import { z } from 'zod';

const esquema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_USERNAME: z.string().min(3),
  ADMIN_PASSWORD: z.string().min(10),
  JWT_SECRETO: z.string().min(32),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof esquema>;

export function leerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return esquema.parse(env);
}
