import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { pedir, SESION_VENCIDA } from './api';

interface Sesion {
  usuario: string;
  invitado: boolean;
}

export interface ValorSesion {
  usuario: string | null;
  invitado: boolean;
  comprobando: boolean;
  entrar: (usuario: string, clave: string) => Promise<void>;
  entrarComoInvitado: () => Promise<void>;
  salir: () => Promise<void>;
}

export const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [comprobando, setComprobando] = useState(true);

  useEffect(() => {
    pedir<Sesion>('/sesion')
      .then(setSesion)
      .catch(() => setSesion(null))
      .finally(() => setComprobando(false));
    const alVencer = () => setSesion(null);
    window.addEventListener(SESION_VENCIDA, alVencer);
    return () => window.removeEventListener(SESION_VENCIDA, alVencer);
  }, []);

  const entrar = useCallback(async (nombre: string, clave: string) => {
    setSesion(await pedir<Sesion>('/sesion', { metodo: 'POST', cuerpo: { usuario: nombre, clave } }));
  }, []);

  const entrarComoInvitado = useCallback(async () => {
    setSesion(await pedir<Sesion>('/sesion/invitado', { metodo: 'POST' }));
  }, []);

  const salir = useCallback(async () => {
    await pedir<void>('/sesion', { metodo: 'DELETE' }).catch(() => undefined);
    setSesion(null);
  }, []);

  const valor = useMemo(
    () => ({
      usuario: sesion?.usuario ?? null,
      invitado: sesion?.invitado ?? false,
      comprobando,
      entrar,
      entrarComoInvitado,
      salir,
    }),
    [sesion, comprobando, entrar, entrarComoInvitado, salir],
  );
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return valor;
}
