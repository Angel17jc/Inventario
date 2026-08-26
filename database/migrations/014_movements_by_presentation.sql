-- Teaches the transactional functions to take a quantity expressed in
-- presentations: 2 cases of 12 rather than 24 bottles.
--
-- The conversion belongs here because the function already holds a lock on the
-- product row. Reading the size outside, doing the arithmetic and writing back
-- would leave a gap in which another till could change the presentation
-- underneath.
--
-- The presentation is read with the organization on it, so a caller cannot pass
-- the id of another shop's case and have its size applied here.

DROP FUNCTION IF EXISTS create_inventory_movement(UUID, INTEGER, VARCHAR, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID);

CREATE FUNCTION create_inventory_movement(
  p_organization_id UUID,
  p_product_id INTEGER,
  p_type VARCHAR,
  p_quantity INTEGER,
  p_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_pack_id INTEGER DEFAULT NULL
)
RETURNS SETOF movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_quantity INTEGER;
  units_in_pack INTEGER;
  base_quantity INTEGER;
  resulting_quantity INTEGER;
BEGIN
  IF p_type NOT IN ('IN', 'OUT', 'ADJUSTMENT') THEN
    RAISE EXCEPTION 'Invalid movement type' USING ERRCODE = '22023';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Movement quantity must be greater than zero' USING ERRCODE = '22023';
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

  base_quantity := p_quantity * COALESCE(units_in_pack, 1);

  resulting_quantity := CASE
    WHEN p_type = 'IN' THEN current_quantity + base_quantity
    WHEN p_type = 'OUT' THEN current_quantity - base_quantity
    ELSE base_quantity
  END;

  UPDATE products
  SET quantity = resulting_quantity
  WHERE id = p_product_id AND organization_id = p_organization_id;

  RETURN QUERY
  INSERT INTO movements (organization_id, product_id, type, quantity, reason, user_id, pack_id, entered_quantity)
  VALUES (p_organization_id, p_product_id, p_type, base_quantity, p_reason, p_user_id::VARCHAR, p_pack_id, p_quantity)
  RETURNING movements.*;
END;
$$;

CREATE FUNCTION create_credit_sale(
  p_organization_id UUID,
  p_product_id INTEGER,
  p_customer_name TEXT,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_pack_id INTEGER DEFAULT NULL
)
RETURNS SETOF credit_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unit_price NUMERIC(10,2);
  units_in_pack INTEGER;
  pack_price NUMERIC(10,2);
  charged_price NUMERIC(10,2);
  base_quantity INTEGER;
  movement_record movements;
  total NUMERIC(10,2);
BEGIN
  IF length(trim(p_customer_name)) = 0 OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Customer name and positive quantity are required' USING ERRCODE = '22023';
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

  base_quantity := p_quantity * COALESCE(units_in_pack, 1);
  -- A presentation without its own price is charged at its size times the unit
  -- price, so a shop that does not discount by the case fills nothing in.
  charged_price := CASE
    WHEN p_pack_id IS NULL THEN unit_price
    ELSE COALESCE(pack_price, unit_price * units_in_pack)
  END;

  UPDATE products SET quantity = quantity - base_quantity
  WHERE id = p_product_id AND organization_id = p_organization_id;

  INSERT INTO movements (organization_id, product_id, type, quantity, reason, user_id, pack_id, entered_quantity)
  VALUES (p_organization_id, p_product_id, 'OUT', base_quantity, 'Fiado a: ' || trim(p_customer_name), p_user_id::VARCHAR, p_pack_id, p_quantity)
  RETURNING * INTO movement_record;

  -- The account records what was agreed with the customer: two cases at the
  -- price of a case, not twenty-four bottles.
  total := charged_price * p_quantity;
  RETURN QUERY
  INSERT INTO credit_accounts (
    organization_id, customer_name, product_id, movement_id, quantity,
    unit_price, total_amount, paid_amount, remaining_amount, status, notes
  ) VALUES (
    p_organization_id, trim(p_customer_name), p_product_id, movement_record.id, p_quantity,
    charged_price, total, 0, total, 'pending', p_notes
  ) RETURNING credit_accounts.*;
END;
$$;

REVOKE ALL ON FUNCTION create_inventory_movement(UUID, INTEGER, VARCHAR, INTEGER, TEXT, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_inventory_movement(UUID, INTEGER, VARCHAR, INTEGER, TEXT, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID, INTEGER) TO service_role;
