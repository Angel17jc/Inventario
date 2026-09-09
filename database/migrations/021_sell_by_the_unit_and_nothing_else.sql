-- Las presentaciones se van.
--
-- Se construyeron para que un producto pudiera venderse en cajas de 6, de 12 y
-- de 24, cada una con su precio. La licorería no trabaja así: compra un lote,
-- lo vende por unidad, y la cantidad que sale de una vez es la que sea — una,
-- tres, doce o veinticuatro. Obligar a elegir una caja con nombre convertía una
-- venta simple en un formulario.
--
-- El dato lo confirma: en toda la base existió una sola presentación, creada
-- durante una prueba, y un solo movimiento la usó. Nadie las utilizó nunca.
--
-- Lo que queda es una cantidad. El stock ya se contaba siempre en unidades
-- base, así que ningún número cambia de significado al quitar esto.

ALTER TABLE movements
  DROP COLUMN IF EXISTS pack_id,
  DROP COLUMN IF EXISTS entered_quantity,
  DROP COLUMN IF EXISTS loose_quantity;

DROP TABLE IF EXISTS product_packs;

-- Registraba un movimiento suelto desde una pantalla que ya no existe: vender
-- pasa por create_sale y reponer por set_product_stock.
DROP FUNCTION IF EXISTS create_inventory_movement(UUID, INTEGER, VARCHAR, INTEGER, TEXT, UUID, INTEGER, INTEGER);

DROP FUNCTION IF EXISTS set_product_stock(UUID, INTEGER, INTEGER, UUID);

CREATE FUNCTION set_product_stock(
  p_organization_id UUID,
  p_product_id INTEGER,
  p_quantity INTEGER,
  p_user_id UUID DEFAULT NULL
)
RETURNS SETOF movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  current_quantity INTEGER;
  difference INTEGER;
BEGIN
  SELECT quantity INTO current_quantity
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
  END IF;

  difference := p_quantity - current_quantity;

  UPDATE products
  SET quantity = p_quantity
  WHERE id = p_product_id AND organization_id = p_organization_id;

  -- Guardar el mismo número no es un movimiento: editar el precio reenvía la
  -- cantidad sin querer cambiarla.
  IF difference = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO movements (organization_id, product_id, type, quantity, reason, user_id)
  VALUES (
    p_organization_id,
    p_product_id,
    CASE WHEN difference > 0 THEN 'IN' ELSE 'OUT' END,
    abs(difference),
    CASE WHEN difference > 0 THEN 'Ingreso de mercadería' ELSE 'Ajuste de conteo' END,
    p_user_id::VARCHAR
  )
  RETURNING movements.*;
END;
$BODY$;

REVOKE ALL ON FUNCTION set_product_stock(UUID, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_product_stock(UUID, INTEGER, INTEGER, UUID) TO service_role;

-- Una venta son líneas de producto y cantidad. Nada más.
DROP FUNCTION IF EXISTS create_sale(UUID, JSONB, UUID);

CREATE FUNCTION create_sale(
  p_organization_id UUID,
  p_items JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (sale_id UUID, total NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  item JSONB;
  v_sale_id UUID := gen_random_uuid();
  v_total NUMERIC(10,2) := 0;
  v_product_id INTEGER;
  v_quantity INTEGER;
  unit_price NUMERIC(10,2);
  line_amount NUMERIC(10,2);
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'A sale needs at least one line' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'A sale cannot carry more than 100 lines' USING ERRCODE = '22023';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'productId')::INTEGER;
    v_quantity := COALESCE((item->>'quantity')::INTEGER, 0);

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Every line needs a quantity greater than zero' USING ERRCODE = '22023';
    END IF;

    -- Se bloquea cada producto al leerlo: el precio con el que se cobra y el
    -- stock que se descuenta salen de la misma lectura.
    SELECT selling_price INTO unit_price
    FROM products
    WHERE id = v_product_id AND organization_id = p_organization_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
    END IF;

    line_amount := unit_price * v_quantity;
    v_total := v_total + line_amount;

    UPDATE products SET quantity = quantity - v_quantity
    WHERE id = v_product_id AND organization_id = p_organization_id;

    INSERT INTO movements (organization_id, product_id, type, quantity, user_id, sale_id, amount)
    VALUES (p_organization_id, v_product_id, 'OUT', v_quantity, p_user_id::VARCHAR, v_sale_id, line_amount);
  END LOOP;

  RETURN QUERY SELECT v_sale_id, v_total;
END;
$BODY$;

REVOKE ALL ON FUNCTION create_sale(UUID, JSONB, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_sale(UUID, JSONB, UUID) TO service_role;

-- El fiado es una venta que además abre una cuenta. Misma simplificación.
DROP FUNCTION IF EXISTS create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID, INTEGER, INTEGER);

CREATE FUNCTION create_credit_sale(
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
AS $BODY$
DECLARE
  unit_price NUMERIC(10,2);
  movement_record movements;
  total NUMERIC(10,2);
BEGIN
  IF length(trim(p_customer_name)) = 0 THEN
    RAISE EXCEPTION 'Customer name is required' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'Credit sale quantity must be greater than zero' USING ERRCODE = '22023';
  END IF;

  SELECT selling_price INTO unit_price
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
  END IF;

  total := unit_price * p_quantity;

  UPDATE products SET quantity = quantity - p_quantity
  WHERE id = p_product_id AND organization_id = p_organization_id;

  INSERT INTO movements (organization_id, product_id, type, quantity, reason, user_id, amount)
  VALUES (
    p_organization_id, p_product_id, 'OUT', p_quantity,
    'Fiado a: ' || trim(p_customer_name), p_user_id::VARCHAR, total
  )
  RETURNING * INTO movement_record;

  RETURN QUERY
  INSERT INTO credit_accounts (
    organization_id, customer_name, product_id, movement_id, quantity,
    unit_price, total_amount, paid_amount, remaining_amount, status, notes
  ) VALUES (
    p_organization_id, trim(p_customer_name), p_product_id, movement_record.id, p_quantity,
    unit_price, total, 0, total, 'pending', p_notes
  ) RETURNING credit_accounts.*;
END;
$BODY$;

REVOKE ALL ON FUNCTION create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID) TO service_role;
