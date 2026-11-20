import type { ReactNode } from 'react';
import { ESTADOS } from '../formato';
import type { Estado } from '../tipos';

export function Insignia({ estado }: { estado: Estado }) {
  return <span className={`insignia insignia-${estado}`}>{ESTADOS[estado]}</span>;
}

export function Aviso({ tipo = 'error', children }: { tipo?: 'error' | 'exito'; children: ReactNode }) {
  return (
    <p className={`aviso aviso-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p className="cargando" role="status">
      {texto}
    </p>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="vacio">{children}</p>;
}

interface PropsPaginacion {
  pagina: number;
  porPagina: number;
  total: number;
  alCambiar: (pagina: number) => void;
}

export function Paginacion({ pagina, porPagina, total, alCambiar }: PropsPaginacion) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button type="button" className="boton boton-claro" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)}>
        ← Anterior
      </button>
      <span aria-live="polite">
        Página {pagina} de {paginas}
      </span>
      <button
        type="button"
        className="boton boton-claro"
        disabled={pagina >= paginas}
        onClick={() => alCambiar(pagina + 1)}
      >
        Siguiente →
      </button>
    </nav>
  );
}

export function Titulo({ antes, acento, kicker }: { antes: string; acento: string; kicker: string }) {
  return (
    <header className="titulo">
      <p className="kicker">{kicker}</p>
      <h1>
        {antes} <em>{acento}</em>
      </h1>
    </header>
  );
}
