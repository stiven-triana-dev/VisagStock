import { useCallback, useEffect, useState } from 'react';

export interface CampoInvalido {
  campo: string;
  mensaje: string;
}

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
    readonly campos: CampoInvalido[] = [],
  ) {
    super(mensaje);
  }
}

export const SESION_VENCIDA = 'visagstock:sesion-vencida';

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
  senal?: AbortSignal;
}

export async function pedir<T>(ruta: string, { metodo = 'GET', cuerpo, senal }: Opciones = {}): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: senal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ErrorApi(0, 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.');
  }
  if (respuesta.status === 204) return undefined as T;
  const datos: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const cuerpoError = (datos ?? {}) as { error?: string; campos?: CampoInvalido[] };
    if (respuesta.status === 401 && ruta !== '/sesion') window.dispatchEvent(new Event(SESION_VENCIDA));
    throw new ErrorApi(respuesta.status, cuerpoError.error ?? 'Ocurrió un error inesperado', cuerpoError.campos);
  }
  return datos as T;
}

export function useDatos<T>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(ruta !== null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (ruta === null) return;
    const control = new AbortController();
    setCargando(true);
    setError(null);
    pedir<T>(ruta, { senal: control.signal })
      .then((resultado) => {
        setDatos(resultado);
        setCargando(false);
      })
      .catch((causa: unknown) => {
        if (control.signal.aborted) return;
        setError(causa instanceof Error ? causa.message : 'Ocurrió un error inesperado');
        setCargando(false);
      });
    return () => control.abort();
  }, [ruta, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { datos, error, cargando, recargar };
}
