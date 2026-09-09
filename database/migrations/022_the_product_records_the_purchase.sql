-- El costo por unidad no es un número que nadie tenga a mano.
--
-- La factura dice "24 cervezas, 17 dólares". El formulario pedía "costo por
-- unidad" y ahí se metía lo que fuera: en la única licorería con datos, el
-- precio de venta quedó en 24 — que no es lo que vale una cerveza, es lo que
-- costó el cajón.
--
-- Así que el producto guarda lo que se compró y por cuánto, tal como viene en
-- la factura, y el costo por unidad se calcula. cost_price se conserva porque
-- es lo que valora el inventario y calcula la ganancia; lo que cambia es que
-- deja de escribirse a mano.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS purchase_units INTEGER,
  ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2);

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_purchase_units_positive,
  DROP CONSTRAINT IF EXISTS products_purchase_price_not_negative;

ALTER TABLE products
  ADD CONSTRAINT products_purchase_units_positive
    CHECK (purchase_units IS NULL OR purchase_units > 0),
  ADD CONSTRAINT products_purchase_price_not_negative
    CHECK (purchase_price IS NULL OR purchase_price >= 0);

COMMENT ON COLUMN products.purchase_units IS
  'Cuántas unidades trae la compra, tal como viene en la factura. NULL: no se registró.';
COMMENT ON COLUMN products.purchase_price IS
  'Lo que costó esa compra completa. El costo por unidad se deriva de las dos.';
COMMENT ON COLUMN products.cost_price IS
  'Costo por unidad. Se calcula: purchase_price / purchase_units. No se escribe a mano.';
