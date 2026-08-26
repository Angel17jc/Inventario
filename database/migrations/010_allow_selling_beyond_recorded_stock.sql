-- Stops the system from refusing a sale because the recorded stock is lower
-- than what is being sold.
--
-- A shop that opens a bottle and sells it by the glass registers more units
-- going out than the count says it has. Blocking that does not make the count
-- right; it stops the sale from being recorded at all, which makes the count
-- worse and leaves money taken with no movement behind it.
--
-- A product may now hold a negative quantity. That is the useful outcome: it
-- says how far the count has drifted from reality, and the low-stock alert
-- picks it up like any other product below its minimum.

-- The floor that made the whole thing impossible. Named per table because
-- credit_accounts carries a constraint of the same name for its sale
-- quantity, which must stay positive: nobody sells zero bottles.
ALTER TABLE products DROP CONSTRAINT IF EXISTS positive_quantity;

CREATE OR REPLACE FUNCTION create_inventory_movement(
  p_organization_id UUID,
  p_product_id INTEGER,
  p_type VARCHAR,
  p_quantity INTEGER,
  p_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS SETOF movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_quantity INTEGER;
  resulting_quantity INTEGER;
BEGIN
  IF p_type NOT IN ('IN', 'OUT', 'ADJUSTMENT') THEN
    RAISE EXCEPTION 'Invalid movement type' USING ERRCODE = '22023';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Movement quantity must be greater than zero' USING ERRCODE = '22023';
  END IF;

  -- The row lock still matters: two tills registering at once must not
  -- overwrite each other's arithmetic, whatever the resulting figure.
  SELECT quantity INTO current_quantity
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
  END IF;

  resulting_quantity := CASE
    WHEN p_type = 'IN' THEN current_quantity + p_quantity
    WHEN p_type = 'OUT' THEN current_quantity - p_quantity
    ELSE p_quantity
  END;

  UPDATE products
  SET quantity = resulting_quantity
  WHERE id = p_product_id AND organization_id = p_organization_id;

  RETURN QUERY
  INSERT INTO movements (organization_id, product_id, type, quantity, reason, user_id)
  VALUES (p_organization_id, p_product_id, p_type, p_quantity, p_reason, p_user_id::VARCHAR)
  RETURNING movements.*;
END;
$$;

CREATE OR REPLACE FUNCTION create_credit_sale(
  p_organization_id UUID,
  p_product_id INTEGER,
  p_customer_name TEXT,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS SETOF credit_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_quantity INTEGER;
  unit_price NUMERIC(10,2);
  movement_record movements;
  total NUMERIC(10,2);
BEGIN
  IF length(trim(p_customer_name)) = 0 OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Customer name and positive quantity are required' USING ERRCODE = '22023';
  END IF;

  SELECT quantity, selling_price INTO current_quantity, unit_price
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
  END IF;

  UPDATE products SET quantity = quantity - p_quantity
  WHERE id = p_product_id AND organization_id = p_organization_id;

  INSERT INTO movements (organization_id, product_id, type, quantity, reason, user_id)
  VALUES (p_organization_id, p_product_id, 'OUT', p_quantity, 'Fiado a: ' || trim(p_customer_name), p_user_id::VARCHAR)
  RETURNING * INTO movement_record;

  total := unit_price * p_quantity;
  RETURN QUERY
  INSERT INTO credit_accounts (
    organization_id, customer_name, product_id, movement_id, quantity,
    unit_price, total_amount, paid_amount, remaining_amount, status, notes
  ) VALUES (
    p_organization_id, trim(p_customer_name), p_product_id, movement_record.id, p_quantity,
    unit_price, total, 0, total, 'pending', p_notes
  ) RETURNING credit_accounts.*;
END;
$$;
