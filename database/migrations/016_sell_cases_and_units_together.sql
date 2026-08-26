-- One sale, both ways of selling.
--
-- A liquor shop hands over a case and six loose beers in a single
-- transaction. Until now that took two movements, because a movement carried
-- one quantity and at most one presentation.
--
-- The movement keeps counting the stock in base units, which does not change.
-- What it gains is the pair the person actually typed: how many whole cases
-- and how many loose units. The arithmetic stays in the function, with the
-- product row locked, so the case size cannot change between being read and
-- being applied.

ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS loose_quantity INTEGER;

COMMENT ON COLUMN movements.entered_quantity IS
  'Cajas que se registraron, en la presentacion de pack_id. NULL: no hubo cajas.';
COMMENT ON COLUMN movements.loose_quantity IS
  'Unidades sueltas que se registraron ademas de las cajas. NULL: no hubo sueltas.';

DROP FUNCTION IF EXISTS create_inventory_movement(UUID, INTEGER, VARCHAR, INTEGER, TEXT, UUID, INTEGER);
DROP FUNCTION IF EXISTS create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID, INTEGER);

CREATE FUNCTION create_inventory_movement(
  p_organization_id UUID,
  p_product_id INTEGER,
  p_type VARCHAR,
  p_quantity INTEGER,
  p_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_pack_id INTEGER DEFAULT NULL,
  p_loose_quantity INTEGER DEFAULT 0
)
RETURNS SETOF movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  current_quantity INTEGER;
  units_in_pack INTEGER;
  pack_quantity INTEGER;
  loose_units INTEGER;
  base_quantity INTEGER;
  resulting_quantity INTEGER;
BEGIN
  IF p_type NOT IN ('IN', 'OUT', 'ADJUSTMENT') THEN
    RAISE EXCEPTION 'Invalid movement type' USING ERRCODE = '22023';
  END IF;

  pack_quantity := COALESCE(p_quantity, 0);
  loose_units := COALESCE(p_loose_quantity, 0);
  IF pack_quantity < 0 OR loose_units < 0 THEN
    RAISE EXCEPTION 'Movement quantities cannot be negative' USING ERRCODE = '22023';
  END IF;
  -- A movement of nothing is not a movement. Either side may be zero, but not
  -- both: one case and six beers are each a whole sale on their own.
  IF pack_quantity = 0 AND loose_units = 0 THEN
    RAISE EXCEPTION 'Movement quantity must be greater than zero' USING ERRCODE = '22023';
  END IF;
  IF pack_quantity > 0 AND p_pack_id IS NULL AND loose_units > 0 THEN
    RAISE EXCEPTION 'Cases need a presentation to be counted in' USING ERRCODE = '22023';
  END IF;

  SELECT quantity INTO current_quantity
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
  END IF;

  IF p_pack_id IS NOT NULL THEN
    SELECT units INTO units_in_pack
    FROM product_packs
    WHERE id = p_pack_id
      AND product_id = p_product_id
      AND organization_id = p_organization_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Presentation not found for this product' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  base_quantity := pack_quantity * COALESCE(units_in_pack, 1) + loose_units;

  resulting_quantity := CASE
    WHEN p_type = 'IN' THEN current_quantity + base_quantity
    WHEN p_type = 'OUT' THEN current_quantity - base_quantity
    ELSE base_quantity
  END;

  UPDATE products
  SET quantity = resulting_quantity
  WHERE id = p_product_id AND organization_id = p_organization_id;

  RETURN QUERY
  INSERT INTO movements (
    organization_id, product_id, type, quantity, reason, user_id,
    pack_id, entered_quantity, loose_quantity
  )
  VALUES (
    p_organization_id, p_product_id, p_type, base_quantity, p_reason, p_user_id::VARCHAR,
    p_pack_id, NULLIF(pack_quantity, 0), NULLIF(loose_units, 0)
  )
  RETURNING movements.*;
END;
$BODY$;

CREATE FUNCTION create_credit_sale(
  p_organization_id UUID,
  p_product_id INTEGER,
  p_customer_name TEXT,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_pack_id INTEGER DEFAULT NULL,
  p_loose_quantity INTEGER DEFAULT 0
)
RETURNS SETOF credit_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  unit_price NUMERIC(10,2);
  units_in_pack INTEGER;
  pack_price NUMERIC(10,2);
  charged_pack_price NUMERIC(10,2);
  pack_quantity INTEGER;
  loose_units INTEGER;
  base_quantity INTEGER;
  movement_record movements;
  total NUMERIC(10,2);
  recorded_quantity INTEGER;
BEGIN
  pack_quantity := COALESCE(p_quantity, 0);
  loose_units := COALESCE(p_loose_quantity, 0);
  IF length(trim(p_customer_name)) = 0 THEN
    RAISE EXCEPTION 'Customer name is required' USING ERRCODE = '22023';
  END IF;
  IF pack_quantity < 0 OR loose_units < 0 OR (pack_quantity = 0 AND loose_units = 0) THEN
    RAISE EXCEPTION 'Credit sale quantity must be greater than zero' USING ERRCODE = '22023';
  END IF;

  SELECT selling_price INTO unit_price
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
  END IF;

  IF p_pack_id IS NOT NULL THEN
    SELECT units, price INTO units_in_pack, pack_price
    FROM product_packs
    WHERE id = p_pack_id
      AND product_id = p_product_id
      AND organization_id = p_organization_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Presentation not found for this product' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  base_quantity := pack_quantity * COALESCE(units_in_pack, 1) + loose_units;
  -- A presentation without its own price is charged at its size times the unit
  -- price, so a shop that does not discount by the case fills nothing in.
  charged_pack_price := CASE
    WHEN p_pack_id IS NULL THEN unit_price
    ELSE COALESCE(pack_price, unit_price * units_in_pack)
  END;

  UPDATE products SET quantity = quantity - base_quantity
  WHERE id = p_product_id AND organization_id = p_organization_id;

  INSERT INTO movements (
    organization_id, product_id, type, quantity, reason, user_id,
    pack_id, entered_quantity, loose_quantity
  )
  VALUES (
    p_organization_id, p_product_id, 'OUT', base_quantity,
    'Fiado a: ' || trim(p_customer_name), p_user_id::VARCHAR,
    p_pack_id, NULLIF(pack_quantity, 0), NULLIF(loose_units, 0)
  )
  RETURNING * INTO movement_record;

  -- Cases at the case price, loose units at the unit price. The account keeps
  -- what was agreed with the customer; unit_price holds the average of the two
  -- so that quantity times unit_price still comes to the total.
  total := charged_pack_price * pack_quantity + unit_price * loose_units;
  recorded_quantity := GREATEST(pack_quantity + loose_units, 1);

  RETURN QUERY
  INSERT INTO credit_accounts (
    organization_id, customer_name, product_id, movement_id, quantity,
    unit_price, total_amount, paid_amount, remaining_amount, status, notes
  ) VALUES (
    p_organization_id, trim(p_customer_name), p_product_id, movement_record.id, recorded_quantity,
    ROUND(total / recorded_quantity, 2), total, 0, total, 'pending', p_notes
  ) RETURNING credit_accounts.*;
END;
$BODY$;

REVOKE ALL ON FUNCTION create_inventory_movement(UUID, INTEGER, VARCHAR, INTEGER, TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_inventory_movement(UUID, INTEGER, VARCHAR, INTEGER, TEXT, UUID, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID, INTEGER, INTEGER) TO service_role;
