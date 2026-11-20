CREATE SCHEMA IF NOT EXISTS inventario;

CREATE TABLE inventario.existencias (
  id          SERIAL       PRIMARY KEY,
  producto_id VARCHAR(10)  NOT NULL REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE,
  talla_id    INTEGER      NULL     REFERENCES public.sizes(id)    ON UPDATE CASCADE ON DELETE RESTRICT,
  cantidad    INTEGER      NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  minimo      INTEGER      NOT NULL DEFAULT 2 CHECK (minimo >= 0),
  actualizado TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (producto_id, talla_id)
);

CREATE TABLE inventario.movimientos (
  id               BIGSERIAL    PRIMARY KEY,
  existencia_id    INTEGER      NOT NULL REFERENCES inventario.existencias(id) ON DELETE CASCADE,
  tipo             VARCHAR(12)  NOT NULL CHECK (tipo IN ('ingreso', 'despacho', 'devolucion', 'baja', 'ajuste')),
  condicion        VARCHAR(10)  NULL     CHECK (condicion IN ('buena', 'danada')),
  unidades         INTEGER      NOT NULL CHECK (unidades >= 0),
  cantidad         INTEGER      NOT NULL,
  stock_resultante INTEGER      NOT NULL CHECK (stock_resultante >= 0),
  motivo           VARCHAR(200) NOT NULL CHECK (char_length(motivo) >= 3),
  usuario          VARCHAR(60)  NOT NULL,
  fecha            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK ((tipo = 'devolucion') = (condicion IS NOT NULL)),
  CHECK (cantidad <> 0 OR (tipo = 'devolucion' AND condicion = 'danada'))
);

CREATE INDEX movimientos_fecha_idx ON inventario.movimientos (fecha DESC);
CREATE INDEX movimientos_existencia_idx ON inventario.movimientos (existencia_id, fecha DESC);
