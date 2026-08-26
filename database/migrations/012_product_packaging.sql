-- Lets one product be sold loose or by the case.
--
-- A shop stocks beer that arrives in cases of 24 and leaves the counter both
-- ways. Modelling that as two products means two stocks that never agree:
-- selling a case leaves 24 loose bottles still on the books.
--
-- Stock is therefore always counted in the base unit — bottles, not cases —
-- and a case is an equivalence applied when the movement is registered. One
-- number to keep straight, and a case sale takes the 24 out of the same place
-- a loose sale takes 1.

ALTER TABLE products
  -- What one of these is called when sold loose: "unidad", "botella", "litro".
  ADD COLUMN IF NOT EXISTS unit_label TEXT NOT NULL DEFAULT 'unidad',
  -- How many base units a case holds. NULL means this product has no case.
  ADD COLUMN IF NOT EXISTS units_per_pack INTEGER,
  -- What the case is called: "caja", "six pack", "docena".
  ADD COLUMN IF NOT EXISTS pack_label TEXT,
  -- Price of a whole case. NULL falls back to units_per_pack × selling_price,
  -- so a shop that does not discount by the case need not fill it in.
  ADD COLUMN IF NOT EXISTS pack_price DECIMAL(10, 2);

ALTER TABLE products
  ADD CONSTRAINT products_units_per_pack_positive
    CHECK (units_per_pack IS NULL OR units_per_pack > 1),
  ADD CONSTRAINT products_pack_needs_a_size
    CHECK (pack_label IS NULL OR units_per_pack IS NOT NULL),
  ADD CONSTRAINT products_pack_price_not_negative
    CHECK (pack_price IS NULL OR pack_price >= 0);

-- Movements keep counting in base units so every total, chart and valuation
-- already written stays correct. These two only remember how it was entered,
-- so the history can read "1 caja" instead of "24 unidades".
ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS sold_as VARCHAR(10) NOT NULL DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS entered_quantity INTEGER;

ALTER TABLE movements
  ADD CONSTRAINT movements_sold_as_known CHECK (sold_as IN ('unit', 'pack'));

UPDATE movements SET entered_quantity = quantity WHERE entered_quantity IS NULL;

COMMENT ON COLUMN products.units_per_pack IS
  'Unidades base que trae una caja. NULL: el producto no se vende por caja.';
COMMENT ON COLUMN movements.quantity IS
  'Siempre en unidades base, cualquiera que sea la forma en que se registró.';
COMMENT ON COLUMN movements.entered_quantity IS
  'Lo que tecleó la persona: 1 si vendió una caja de 24, con quantity = 24.';
