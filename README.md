# VisagStock

Inventario por talla para **VisagShop**, la tienda de ropa urbana de Lebrija (Santander).

La tienda en línea sabe qué productos existen y en qué tallas vienen, pero no sabía **cuántas unidades
quedan** de cada talla. VisagStock resuelve eso: lleva la cuenta de cada talla, guarda cada ingreso,
despacho, devolución y baja con su motivo, y avisa cuando algo está por agotarse.

![Resumen del inventario](docs/resumen.png)

## Qué hace

- **Stock por talla.** Cada producto muestra sus tallas (S, M, L, 28-8, 32-12…) con las unidades que
  quedan. Los productos sin tallas, como algunas gorras, aparecen con la talla **"Única"**.
- **Estados y alertas.** Cada talla tiene un mínimo ("avisar desde"). Con 0 unidades está **agotada**;
  con el mínimo o menos está en **stock bajo**; si no, está **disponible**. El resumen muestra los
  productos que hay que reponer pronto.
- **Cinco tipos de movimiento**, con los nombres que se usan en un kárdex de inventario:

  | Tipo | Qué pasa con el stock | Cuándo se usa |
  | --- | --- | --- |
  | **Ingreso** | Suma | Llegó mercancía del proveedor o del taller. |
  | **Despacho** | Resta | La prenda salió hacia el cliente (venta en tienda, WhatsApp, por mayor, envío). |
  | **Devolución** | Depende del estado | El cliente devolvió la prenda. **En buen estado** vuelve a la venta (suma). **Dañada** *no* vuelve a la venta: el stock no cambia, pero queda registrada como prenda dañada. |
  | **Baja** | Resta | Una prenda que ya no se puede vender y nunca llegó al cliente: dañada, manchada o perdida en la tienda. |
  | **Ajuste** | Lo que se contó | Se escribe cuántas unidades se contaron a mano y el sistema guarda la diferencia. |
- **Historial.** Cada movimiento queda guardado con fecha, talla, cambio, cuánto quedó, motivo y quién
  lo hizo. Se puede filtrar por producto, tipo y fechas.
- **Nunca vende de más.** Si quedan 2 unidades y alguien intenta sacar 3, se rechaza. Esto funciona
  incluso si dos personas registran ventas **al mismo tiempo**.
- **Solo entra el administrador**, con usuario y contraseña.

| Productos | Detalle y movimiento | En el celular |
| --- | --- | --- |
| ![Productos](docs/productos.png) | ![Detalle](docs/detalle.png) | ![Celular](docs/celular.png) |

![Kárdex con ingresos, despachos, devoluciones, bajas y ajustes](docs/movimientos.png)

## Qué usé y por qué

| Herramienta | Para qué | Por qué la elegí |
| --- | --- | --- |
| **TypeScript** (API y pantallas) | Todo el código | Avisa los errores *antes* de ejecutar: si la API cambia la forma de un dato, la pantalla no compila hasta corregirla. |
| **Node.js + Express 5** | La API | Es lo mismo que usa VisagShop, así que el conocimiento se reutiliza. Express 5 ya maneja los errores de funciones `async` sin código extra. |
| **PostgreSQL (Neon)** | Guardar el stock y los movimientos | Es **la misma base de datos de la tienda**. Las tablas nuevas viven en un esquema aparte llamado `inventario`, para no mezclarse con las de la tienda. |
| **pg** (sin ORM) | Hablar con la base | Las consultas importantes (bloqueos, uniones de tablas) se ven claras en SQL. |
| **Zod** | Revisar los datos que llegan | Una sola regla sirve para validar y para darle el tipo correcto en TypeScript. |
| **JSON Web Token en cookie** | La sesión del administrador | La cookie es `httpOnly` (el JavaScript de la página no la puede leer) y `SameSite=strict` (otros sitios no la pueden usar). |
| **React 19 + React Router** | Las pantallas | Componentes reutilizables (la tabla de movimientos se usa en tres pantallas) y filtros guardados en la dirección de la página. |
| **Vite** | Correr y compilar las pantallas | Arranca en milisegundos y en desarrollo reenvía `/api` al servidor. |
| **Vitest + Supertest + Testing Library** | Pruebas | Prueban la API contra una base PostgreSQL real y las pantallas como las usaría una persona. |
| **GitHub Actions** | Correr las pruebas en cada cambio | Levanta su propio PostgreSQL y revisa tipos, pruebas y compilación. |
| **Render** | Publicarla | Plan gratuito; la API y las pantallas salen en un solo servicio. |

## Cómo funciona por dentro

```
Navegador (React)  ──/api──▶  API (Express)  ──▶  PostgreSQL (Neon)
                                                   ├─ public.products, sizes...  ← tablas de la tienda (solo se leen)
                                                   └─ inventario.existencias      ← unidades por producto y talla
                                                      inventario.movimientos      ← historial
```

- **No se toca la tienda.** VisagStock solo *lee* los productos y tallas de VisagShop y escribe en su
  propio esquema `inventario`. Si se borra un producto en la tienda, su stock se borra solo
  (`ON DELETE CASCADE`).
- **Las tablas se crean solas.** Al arrancar, la API revisa qué migraciones (`api/src/migraciones`)
  faltan y las aplica. Usa un *candado* de PostgreSQL para que dos servidores no lo hagan a la vez.
- **Un solo origen.** En producción la misma API entrega las pantallas compiladas, así que no hace
  falta configurar CORS.

### La API

Todas las rutas empiezan por `/api`. Las marcadas con 🔒 piden sesión.

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/estado` | Responde `ok` (lo usa Render para saber si está viva) |
| POST | `/sesion` | Inicia sesión (máximo 10 intentos cada 15 minutos) |
| GET / DELETE | `/sesion` | Consulta o cierra la sesión |
| GET 🔒 | `/resumen` | Cifras generales, alertas y últimos movimientos |
| GET 🔒 | `/productos?buscar=&estado=&pagina=` | Productos con su stock por talla |
| GET 🔒 | `/productos/:id` | Un producto y sus últimos 20 movimientos |
| GET 🔒 | `/movimientos?productoId=&tipo=&desde=&hasta=` | Historial con filtros |
| POST 🔒 | `/movimientos` | Registra un ingreso, despacho, devolución (con `condicion`: `buena` o `danada`), baja o ajuste |
| PUT 🔒 | `/minimos` | Cambia el mínimo de una talla |

## Correrlo en tu computador

Necesitas **Node.js 22.12 o superior** y una base PostgreSQL que tenga las tablas de VisagShop.

```bash
npm install
cp api/.env.example api/.env
```

Llena `api/.env`:

| Variable | Qué es |
| --- | --- |
| `DATABASE_URL` | La conexión a PostgreSQL (la misma de VisagShop) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Con qué se entra (la contraseña debe tener al menos 10 caracteres) |
| `JWT_SECRETO` | Un texto secreto largo (mínimo 32 caracteres) para firmar las sesiones |
| `TEST_DATABASE_URL` | Opcional: un PostgreSQL donde las pruebas puedan crear bases temporales |

Luego, en dos terminales:

```bash
npm run dev:api   # API en http://localhost:4000
npm run dev:web   # Pantallas en http://localhost:5173
```

Otros comandos:

```bash
npm test          # pruebas de la API y de las pantallas
npm run typecheck # revisa los tipos de todo el proyecto
npm run build     # compila las pantallas y la API
npm start         # arranca la versión compilada
```

## Pruebas

- **API (26 pruebas).** Cada ejecución crea una base PostgreSQL temporal con productos de ejemplo,
  aplica las migraciones, prueba y la borra al final. Se revisan la sesión, la cookie, el bloqueo
  de otros sitios, la búsqueda sin tildes, los cinco tipos de movimiento, que una devolución dañada
  quede registrada **sin** volver a la venta, las tallas que no son del producto, los datos mal
  formados y **ocho despachos simultáneos con solo cinco unidades**: se aceptan exactamente cinco.
- **Pantallas (11 pruebas).** El formulario muestra cuánto quedará, no deja despachar ni dar de baja
  más de lo que hay, exige el estado de la prenda en una devolución, envía bien los datos y muestra
  los errores de la API. También se prueban los textos en español ("queda 1 unidad", "1.200 unidades").

Si `TEST_DATABASE_URL` no está definida, las pruebas de la API se saltan en vez de fallar.

## Render

El archivo `render.yaml` ya trae la configuración. En Render: **New → Blueprint**, se elige este
repositorio y se llenan `DATABASE_URL` (la misma de VisagShop en Neon), `ADMIN_USERNAME` y
`ADMIN_PASSWORD`. El secreto de las sesiones lo genera Render solo.

## Qué aprendí

1. **Bloquear la fila antes de restar.** Si dos ventas leen "quedan 5" al mismo tiempo, las dos
   restan y el stock queda mal. Con `SELECT … FOR UPDATE` dentro de una transacción, la segunda venta
   *espera* a que termine la primera y lee el número ya actualizado. Lo comprobamos con una prueba que
   lanza ocho ventas a la vez.
2. **`NULL` también puede ser una talla.** Los productos sin tallas se guardan con `talla_id` vacío.
   En SQL dos `NULL` normalmente son "distintos", así que la regla de "una sola fila por producto y
   talla" no funcionaba. `UNIQUE NULLS NOT DISTINCT` (PostgreSQL 15+) y `IS NOT DISTINCT FROM`
   resuelven eso.
3. **Guardar el cambio, no solo el resultado.** Cada movimiento guarda cuánto cambió (`+10`, `-3`) y
   cuánto quedó. Así el historial se entiende solo y un ajuste muestra exactamente la diferencia.
4. **Comparar contraseñas sin dar pistas.** Una comparación normal termina antes cuando la primera
   letra no coincide, y eso se puede medir. Usamos `timingSafeEqual`, que siempre tarda lo mismo.
5. **La misma validación en los dos lados.** La pantalla avisa "solo quedan 2 unidades" antes de
   enviar, pero la API vuelve a revisarlo. La pantalla ayuda; la API es la que manda.
6. **TypeScript en todo el camino.** Los tipos de la API y de las pantallas tienen la misma forma;
   muchos errores aparecieron al compilar y no frente al usuario.
7. **Pensar en el negocio antes que en el código.** Al principio solo existían "entrada" y "salida".
   Pero una prenda devuelta dañada no puede volver a la venta, y una prenda que se daña en la tienda
   no es una venta. Por eso separamos **Devolución** (con el estado de la prenda) y **Baja**. La base de
   datos también lo protege: una devolución sin estado, o un movimiento que no cambia nada (salvo la
   devolución dañada), se rechaza con reglas `CHECK`.
8. **Pruebas contra una base real.** Simular la base no hubiera detectado el problema de los `NULL`
   ni el de las ventas simultáneas. Por eso las pruebas usan PostgreSQL de verdad.

## Problemas que tuve y cómo los resolví

| Problema | Por qué pasaba | Cómo lo resolví |
| --- | --- | --- |
| Al compilar, el servidor no encontraba las migraciones. | TypeScript solo copia archivos `.ts`; los `.sql` se quedaban por fuera de `dist`. | El comando `build` de la API ahora copia la carpeta `migraciones` después de compilar. |
| Al entrar en modo desarrollo salía **"Origen no permitido"**. | Vite reenvía `/api` al servidor y cambia el `Host`, entonces la protección contra otros sitios veía un origen distinto. | Se ajustó solo el reenvío de Vite para que use el mismo origen. La API sigue igual de estricta. |
| Las fotos de las tarjetas tardaban en aparecer. | Se cargaba la foto completa (≈32 KB cada una) desde la tienda. | Se usan las miniaturas WebP que la tienda ya tenía (≈6 KB, cinco veces más livianas). |
| En el celular las tarjetas se salían de la pantalla. | En CSS Grid, una columna `1fr` no se encoge más que su contenido, y las tablas la empujaban. | Se cambió a `minmax(0, 1fr)`; ahora las tablas se deslizan de lado dentro de su tarjeta. |
| La base de pruebas local dejó de funcionar ("could not open file"). | Los archivos temporales donde vivía se borraron a medias. | Se creó de nuevo desde cero, y las pruebas crean cada base con `TEMPLATE template0`, que es más resistente. |
| Con todo en cero, el resumen decía "¡Todo en orden!". | Solo se revisaba si había alertas, no si había unidades. | Si no hay unidades, ahora invita a registrar el primer ingreso. |
| Textos con errores: "Ajuste guardada", "quedan 1 unidad". | Se armaban las frases pegando palabras sin revisar género ni número. | Frases completas para cada tipo y una función `quedan()` que concuerda el verbo; tiene su propia prueba. |
| Una prenda devuelta **dañada** volvía a quedar disponible para la venta. | Solo existían "entrada" y "salida": cualquier devolución se registraba como entrada y sumaba al stock. | Los tipos pasaron a nombres de kárdex (Ingreso, Despacho, Ajuste) y se añadieron **Devolución**, que pide el estado de la prenda (en buen estado suma; dañada no suma pero queda registrada), y **Baja**, para prendas dañadas en la tienda. El resumen muestra cuántas unidades se dañaron en la semana. |
| VisagStock no se parecía a VisagShop: tenía la barra negra y un verde lima muy fuerte. | Usaba los mismos códigos de color de la tienda, pero repartidos distinto: el lima, que en VisagShop casi no aparece, era el color principal. | Revisé la tienda en línea y copié cómo usa los colores: encabezado claro con el logo redondo, fondo crema, botones casi negros y detalles en verde salvia. Ahora las dos se ven como parte de la misma marca. |
| En el buscador se borraba el espacio mientras se escribía. | Al actualizar la dirección, el texto se reemplazaba por la versión sin espacios del final. | Solo se reemplaza el texto si de verdad cambió la búsqueda. |
