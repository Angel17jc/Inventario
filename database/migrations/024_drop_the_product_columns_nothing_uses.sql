-- Dos columnas de products que ya no escribe ni lee nadie.
--
-- min_stock_level servía para avisar de "stock bajo". Ese aviso se quitó: el
-- único que pidió la licorería es "agotado", que se calcula con quantity <= 0.
-- Desde entonces la columna guardaba un 5 por defecto que nada consultaba.
--
-- description salió del formulario del producto a petición del usuario. La API
-- dejó de aceptarla y ninguna pantalla la muestra.
--
-- ATENCIÓN antes de aplicar: a 23 de septiembre de 2026 una fila tiene texto en
-- description — el producto "lg" de la licorería "404 NoT Founds" dice
-- "MUCHO TRAGO". No se ve en ninguna pantalla desde que se quitó el campo, pero
-- esta migración lo borra. Si hay que conservarlo, no aplicarla.
--
-- La descripción de las CATEGORÍAS no se toca: esa sí se usa.

ALTER TABLE products
  DROP COLUMN IF EXISTS min_stock_level,
  DROP COLUMN IF EXISTS description;
