CREATE TABLE public.categories (
  id   SERIAL      PRIMARY KEY,
  name VARCHAR(70) NOT NULL UNIQUE
);

CREATE TABLE public.sizes (
  id   SERIAL      PRIMARY KEY,
  name VARCHAR(25) NOT NULL UNIQUE
);

CREATE TABLE public.products (
  id          VARCHAR(10)  PRIMARY KEY CHECK (id ~ '^p[0-9]{3,}$'),
  name        VARCHAR(120) NOT NULL,
  price       INTEGER      NULL,
  image       VARCHAR(200) NOT NULL,
  category_id INTEGER      NOT NULL REFERENCES public.categories(id)
);

CREATE TABLE public.product_sizes (
  product_id VARCHAR(10) NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id    INTEGER     NOT NULL REFERENCES public.sizes(id),
  position   SMALLINT    NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, size_id)
);

INSERT INTO public.categories (id, name) VALUES (1, 'Camisetas'), (2, 'Pantalones'), (3, 'Gorras');
INSERT INTO public.sizes (id, name) VALUES (1, 'S'), (2, 'M'), (3, 'L');

INSERT INTO public.products (id, name, price, image, category_id) VALUES
  ('p001', 'Camiseta Oversize Negra', 59000, '/img/p001.jpg', 1),
  ('p002', 'Pantalón Cargo Beige', 120000, '/img/p002.jpg', 2),
  ('p003', 'Gorra Clásica', 45000, '/img/p003.jpg', 3);

INSERT INTO public.product_sizes (product_id, size_id, position) VALUES
  ('p001', 1, 0), ('p001', 2, 1), ('p001', 3, 2),
  ('p002', 2, 0), ('p002', 3, 1);
