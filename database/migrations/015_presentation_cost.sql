-- A presentation is what the shop actually buys and what it actually sells.
--
-- Until now a presentation only carried a selling price. The cost lived on the
-- product, as a figure per unit, which is not the number anyone in a liquor
-- shop has in front of them: the invoice says what a case of twelve cost, and
-- cases come in sixes, twelves and twenty-fours, each at its own price.
--
-- So the cost of the case goes on the case. The per-unit cost the dashboard
-- values the stock with is derived from it — cost divided by size — which is
-- one number to keep up to date instead of two that can disagree.

ALTER TABLE product_packs
  ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2);

ALTER TABLE product_packs
  DROP CONSTRAINT IF EXISTS product_packs_cost_not_negative;

ALTER TABLE product_packs
  ADD CONSTRAINT product_packs_cost_not_negative CHECK (cost IS NULL OR cost >= 0);

COMMENT ON COLUMN product_packs.cost IS
  'Lo que le cuesta a la licorería una unidad de esta presentación: el precio de la caja en la factura. NULL: se desconoce, se usa el costo por unidad del producto.';
COMMENT ON COLUMN product_packs.price IS
  'A cuánto vende la licorería esta presentación completa. NULL: unidades x precio por unidad.';
