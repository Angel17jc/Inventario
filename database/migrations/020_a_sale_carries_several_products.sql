-- Un cliente se lleva una caja de cerveza, un whisky y cigarrillos, y paga una
-- sola vez. Hasta ahora eso eran tres registros separados: sin total, sin nada
-- que dijera que fueron la misma compra, y el tendero sumando de cabeza.
--
-- Dos cosas cambian:
--
-- 1. Los movimientos de una misma venta comparten sale_id, así que el historial
--    puede leerlos juntos sin que las tablas se mezclen.
-- 2. El movimiento guarda a cuánto se vendió. No estaba en ningún sitio, y
--    calcularlo después con los precios de hoy da un número falso en cuanto
--    alguien cambia un precio: lo que se cobró es un hecho del pasado.

ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS sale_id UUID,
  ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2);

ALTER TABLE movements
  DROP CONSTRAINT IF EXISTS movements_amount_not_negative;
ALTER TABLE movements
  ADD CONSTRAINT movements_amount_not_negative CHECK (amount IS NULL OR amount >= 0);

CREATE INDEX IF NOT EXISTS idx_movements_sale ON movements(sale_id) WHERE sale_id IS NOT NULL;

COMMENT ON COLUMN movements.sale_id IS
  'Agrupa los movimientos registrados en una misma venta. NULL: movimiento suelto.';
COMMENT ON COLUMN movements.amount IS
  'Lo que se cobró por esta línea, al precio del momento. NULL en entradas y ajustes.';

-- Registra una venta completa: varias líneas, una sola transacción.
--
-- Las líneas llegan como JSON porque su número no se conoce de antemano. Cada
-- una se valida y se cobra por separado, y basta que una falle para que no se
-- registre ninguna: media venta guardada sería peor que ninguna.
CREATE OR REPLACE FUNCTION create_sale(
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
  v_pack_id INTEGER;
  v_packs INTEGER;
  v_loose INTEGER;
  unit_price NUMERIC(10,2);
  units_in_pack INTEGER;
  pack_price NUMERIC(10,2);
  charged_pack NUMERIC(10,2);
  base_quantity INTEGER;
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
    v_pack_id := NULLIF(item->>'packId', '')::INTEGER;
    v_packs := COALESCE((item->>'quantity')::INTEGER, 0);
    v_loose := COALESCE((item->>'looseQuantity')::INTEGER, 0);

    IF v_packs < 0 OR v_loose < 0 OR (v_packs = 0 AND v_loose = 0) THEN
      RAISE EXCEPTION 'Every line needs a quantity greater than zero' USING ERRCODE = '22023';
    END IF;

    -- Se bloquea cada producto al leerlo, igual que una venta de una línea: el
    -- tamaño de la caja no puede cambiar entre que se lee y se aplica.
    SELECT selling_price INTO unit_price
    FROM products
    WHERE id = v_product_id AND organization_id = p_organization_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
    END IF;

    units_in_pack := NULL;
    pack_price := NULL;
    IF v_pack_id IS NOT NULL THEN
      SELECT units, price INTO units_in_pack, pack_price
      FROM product_packs
      WHERE id = v_pack_id
        AND product_id = v_product_id
        AND organization_id = p_organization_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Presentation not found for this product' USING ERRCODE = 'P0002';
      END IF;
    END IF;

    base_quantity := v_packs * COALESCE(units_in_pack, 1) + v_loose;
    charged_pack := CASE
      WHEN v_pack_id IS NULL THEN unit_price
      ELSE COALESCE(pack_price, unit_price * units_in_pack)
    END;
    -- Las cajas al precio de la caja, las sueltas al precio por unidad. Es la
    -- razón de tener los dos precios.
    line_amount := charged_pack * v_packs + unit_price * v_loose;
    v_total := v_total + line_amount;

    UPDATE products SET quantity = quantity - base_quantity
    WHERE id = v_product_id AND organization_id = p_organization_id;

    INSERT INTO movements (
      organization_id, product_id, type, quantity, user_id,
      pack_id, entered_quantity, loose_quantity, sale_id, amount
    )
    VALUES (
      p_organization_id, v_product_id, 'OUT', base_quantity, p_user_id::VARCHAR,
      v_pack_id, NULLIF(v_packs, 0), NULLIF(v_loose, 0), v_sale_id, line_amount
    );
  END LOOP;

  RETURN QUERY SELECT v_sale_id, v_total;
END;
$BODY$;

REVOKE ALL ON FUNCTION create_sale(UUID, JSONB, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_sale(UUID, JSONB, UUID) TO service_role;

COMMENT ON FUNCTION create_sale IS
  'Registra una venta de varias líneas en una sola transacción. Devuelve el identificador de la venta y su total.';

-- El fiado también es una venta: la mercadería salió, lo que falta es el pago.
-- Se recrea solo para que su movimiento guarde el importe, como los demás.
DROP FUNCTION IF EXISTS create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID, INTEGER, INTEGER);

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
  charged_pack_price := CASE
    WHEN p_pack_id IS NULL THEN unit_price
    ELSE COALESCE(pack_price, unit_price * units_in_pack)
  END;
  total := charged_pack_price * pack_quantity + unit_price * loose_units;

  UPDATE products SET quantity = quantity - base_quantity
  WHERE id = p_product_id AND organization_id = p_organization_id;

  INSERT INTO movements (
    organization_id, product_id, type, quantity, reason, user_id,
    pack_id, entered_quantity, loose_quantity, amount
  )
  VALUES (
    p_organization_id, p_product_id, 'OUT', base_quantity,
    'Fiado a: ' || trim(p_customer_name), p_user_id::VARCHAR,
    p_pack_id, NULLIF(pack_quantity, 0), NULLIF(loose_units, 0), total
  )
  RETURNING * INTO movement_record;

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

REVOKE ALL ON FUNCTION create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_credit_sale(UUID, INTEGER, TEXT, INTEGER, TEXT, UUID, INTEGER, INTEGER) TO service_role;
