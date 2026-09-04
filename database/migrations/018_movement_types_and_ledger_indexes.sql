-- Dos cosas que la auditoría de septiembre dejó en la base.
--
-- 1. El tipo ADJUSTMENT. Fijaba el stock a una cifra absoluta en vez de
--    moverlo: la licorería reescribía su propio inventario sin que quedara
--    nada que explicara por qué. La decisión de producto lo quitó de las
--    pantallas, la API dejó de aceptarlo, y la función seguía conociéndolo.
--    Ninguna fila de movements lo usó nunca (comprobado el 3 de septiembre de
--    2026), así que restringirlo no reescribe historia. El CHECK es lo que lo
--    impide de verdad: la API puede volver a equivocarse, la tabla no.
--
-- 2. Los índices del historial. `movements` ya tiene el suyo por
--    (organization_id, created_at DESC) desde la 003, pero sus dos compañeros
--    en el historial unificado no: `credit_payments` solo está indexado por
--    organización y `credit_accounts` por (organization_id, status). Las dos
--    consultas ordenan por fecha, así que hoy Postgres ordena en memoria en
--    cada llamada.

-- ---------------------------------------------------------------- 1. Tipos

ALTER TABLE movements
  DROP CONSTRAINT IF EXISTS movements_type_known;

ALTER TABLE movements
  ADD CONSTRAINT movements_type_known CHECK (type IN ('IN', 'OUT'));

COMMENT ON COLUMN movements.type IS
  'IN entra stock, OUT sale. No hay ajuste: el inventario se mueve, no se reescribe.';

-- Misma firma que la 016; cambia solo qué tipos admite y cómo calcula el
-- resultado, que ya no puede ser un valor absoluto.
CREATE OR REPLACE FUNCTION create_inventory_movement(
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
  IF p_type NOT IN ('IN', 'OUT') THEN
    RAISE EXCEPTION 'Invalid movement type' USING ERRCODE = '22023';
  END IF;

  pack_quantity := COALESCE(p_quantity, 0);
  loose_units := COALESCE(p_loose_quantity, 0);
  IF pack_quantity < 0 OR loose_units < 0 THEN
    RAISE EXCEPTION 'Movement quantities cannot be negative' USING ERRCODE = '22023';
  END IF;
  -- Un movimiento de nada no es un movimiento. Cualquiera de los dos lados
  -- puede ser cero, pero no los dos.
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

  -- Sumar o restar. Ya no hay una rama que fije el stock a un valor.
  resulting_quantity := CASE
    WHEN p_type = 'IN' THEN current_quantity + base_quantity
    ELSE current_quantity - base_quantity
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

REVOKE ALL ON FUNCTION create_inventory_movement(UUID, INTEGER, VARCHAR, INTEGER, TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_inventory_movement(UUID, INTEGER, VARCHAR, INTEGER, TEXT, UUID, INTEGER, INTEGER) TO service_role;

-- ------------------------------------------------------------- 2. Índices

-- GET /api/movimientos/historial lee las dos tablas acotadas por licorería y
-- ordenadas por fecha descendente, igual que hace con movements.
CREATE INDEX IF NOT EXISTS idx_credit_payments_organization_created_at
  ON credit_payments(organization_id, created_at DESC);

-- La lista de fiados usa el mismo orden.
CREATE INDEX IF NOT EXISTS idx_credit_accounts_organization_created_at
  ON credit_accounts(organization_id, created_at DESC);
