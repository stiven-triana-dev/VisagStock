import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Link, RouterProvider } from 'react-router';
import { Cargando } from './componentes/comunes';
import { Marco } from './componentes/Marco';
import { Entrar } from './paginas/Entrar';
import { Movimientos } from './paginas/Movimientos';
import { Producto } from './paginas/Producto';
import { Productos } from './paginas/Productos';
import { Resumen } from './paginas/Resumen';
import { ProveedorSesion, useSesion } from './sesion';
import './estilos.css';

function NoEncontrada() {
  return (
    <>
      <h1>Esta página no existe</h1>
      <Link className="enlace-flecha" to="/">
        Ir al resumen ↗
      </Link>
    </>
  );
}

const rutas = createBrowserRouter([
  {
    element: <Marco />,
    children: [
      { index: true, element: <Resumen /> },
      { path: 'productos', element: <Productos /> },
      { path: 'productos/:id', element: <Producto /> },
      { path: 'movimientos', element: <Movimientos /> },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
]);

function Aplicacion() {
  const { usuario, comprobando } = useSesion();
  if (comprobando) return <Cargando texto="Abriendo VisagStock…" />;
  if (!usuario) return <Entrar />;
  return <RouterProvider router={rutas} />;
}

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento raiz');

createRoot(raiz).render(
  <StrictMode>
    <ProveedorSesion>
      <Aplicacion />
    </ProveedorSesion>
  </StrictMode>,
);
