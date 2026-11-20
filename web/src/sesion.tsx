import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { pedir, SESION_VENCIDA } from './api';

interface ValorSesion {
  usuario: string | null;
  comprobando: boolean;
  entrar: (usuario: string, clave: string) => Promise<void>;
  salir: () => Promise<void>;
}

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<string | null>(null);
  const [comprobando, setComprobando] = useState(true);

  useEffect(() => {
    pedir<{ usuario: string }>('/sesion')
      .then((datos) => setUsuario(datos.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setComprobando(false));
    const alVencer = () => setUsuario(null);
    window.addEventListener(SESION_VENCIDA, alVencer);
    return () => window.removeEventListener(SESION_VENCIDA, alVencer);
  }, []);

  const entrar = useCallback(async (nombre: string, clave: string) => {
    const datos = await pedir<{ usuario: string }>('/sesion', { metodo: 'POST', cuerpo: { usuario: nombre, clave } });
    setUsuario(datos.usuario);
  }, []);

  const salir = useCallback(async () => {
    await pedir<void>('/sesion', { metodo: 'DELETE' }).catch(() => undefined);
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, comprobando, entrar, salir }), [usuario, comprobando, entrar, salir]);
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return valor;
}
