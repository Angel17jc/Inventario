-- Corrects migration 012, which gave a product one case size.
--
-- Reality has more than one: whisky travels in cases of 6 and of 12, beer in
-- tens and twelves, and the same shop stocks both. A single units_per_pack
-- column forces a choice that does not exist, or two products for what is one
-- product on the shelf.
--
-- A product therefore has presentations. Each says what it is called, how many
-- base units it holds and what it costs, and a sale points at the one that was
-- used. Adding a size later is a row, not a schema change.
--
-- Stock stays counted in base units. That does not change and is what keeps the
-- arithmetic honest whichever presentation leaves the counter.

CREATE TABLE IF NOT EXISTS product_packs (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL,
  product_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  units INTEGER NOT NULL,
  -- NULL charges units × selling_price: a shop that does not discount by the
  -- case has nothing to fill in.
  price DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_packs_label_not_blank CHECK (length(trim(label)) > 0),
  -- One unit is not a presentation; that is the base unit itself.
  CONSTRAINT product_packs_units_above_one CHECK (units > 1),
  CONSTRAINT product_packs_price_not_negative CHECK (price IS NULL OR price >= 0),
  -- Two presentations of the same size on one product would be a coin toss at
  -- the till.
  CONSTRAINT product_packs_unique_size UNIQUE (product_id, units),
  -- Same shape as every other relationship here: the pair carries the tenant so
  -- a presentation can never belong to another shop's product.
  CONSTRAINT product_packs_product_organization_fkey
    FOREIGN KEY (product_id, organization_id) REFERENCES products(id, organization_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_packs_id_organization
  ON product_packs(id, organization_id);
CREATE INDEX IF NOT EXISTS idx_product_packs_product ON product_packs(product_id);

-- Carry across anything migration 012 recorded before this correction.
INSERT INTO product_packs (organization_id, product_id, label, units, price)
SELECT organization_id, id, COALESCE(pack_label, 'Caja'), units_per_pack, pack_price
FROM products
WHERE units_per_pack IS NOT NULL AND units_per_pack > 1
ON CONFLICT (product_id, units) DO NOTHING;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_units_per_pack_positive,
  DROP CONSTRAINT IF EXISTS products_pack_needs_a_size,
  DROP CONSTRAINT IF EXISTS products_pack_price_not_negative;

ALTER TABLE products
  DROP COLUMN IF EXISTS units_per_pack,
  DROP COLUMN IF EXISTS pack_label,
  DROP COLUMN IF EXISTS pack_price;

-- A movement points at the presentation it was registered with. NULL means
-- loose units, which is what every movement before this meant.
ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS pack_id INTEGER;

ALTER TABLE movements
  DROP CONSTRAINT IF EXISTS movements_sold_as_known;

ALTER TABLE movements
  DROP COLUMN IF EXISTS sold_as;

ALTER TABLE movements
  ADD CONSTRAINT movements_pack_organization_fkey
    FOREIGN KEY (pack_id, organization_id) REFERENCES product_packs(id, organization_id) ON DELETE SET NULL (pack_id);

-- Same posture as every other table: the browser reaches none of this
-- directly, the API does the reading with the service key.
ALTER TABLE product_packs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON product_packs FROM anon, authenticated;

COMMENT ON TABLE product_packs IS
  'Presentaciones de un producto: caja de 6, caja de 12. El stock siempre se cuenta en unidades base.';
COMMENT ON COLUMN movements.pack_id IS
  'Presentación con la que se registró. NULL: unidades sueltas.';
COMMENT ON COLUMN movements.entered_quantity IS
  'Lo que tecleó la persona: 2 si vendió 2 cajas de 12, con quantity = 24.';
