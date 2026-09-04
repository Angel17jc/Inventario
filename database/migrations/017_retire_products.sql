-- Un producto se retira del catálogo; su historia no se borra.
--
-- Hasta ahora, borrar un producto hacía tres cosas en tres viajes distintos y
-- sin transacción: leía sus cuentas de fiado, decidía si alguna estaba
-- pendiente, y si todas estaban pagadas las borraba junto con el producto. Un
-- fiado registrado entre la comprobación y el borrado se perdía.
--
-- Y aunque no hubiera nadie más vendiendo, borrar una cuenta pagada elimina la
-- prueba de que un cliente pagó. Eso es contabilidad de la licorería, no un
-- dato de catálogo. Un producto que ya no se vende deja de aparecer en las
-- pantallas y sus movimientos y sus fiados siguen donde estaban.
--
-- La comprobación y la baja ocurren con la fila del producto bloqueada, igual
-- que en 005 y 016, para que ningún fiado se cuele entre contar y retirar.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ;

COMMENT ON COLUMN products.retired_at IS
  'Fecha en que se retiró del catálogo. NULL: en venta. La historia se conserva.';

-- Las pantallas piden siempre los productos en venta de una licorería.
CREATE INDEX IF NOT EXISTS idx_products_organization_active
  ON products(organization_id) WHERE retired_at IS NULL;

CREATE OR REPLACE FUNCTION retire_product(
  p_organization_id UUID,
  p_product_id INTEGER
)
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  open_accounts INTEGER;
BEGIN
  PERFORM 1
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
  END IF;

  -- Con la fila bloqueada: ninguna venta a crédito puede registrarse entre
  -- este recuento y la baja de abajo.
  SELECT count(*) INTO open_accounts
  FROM credit_accounts
  WHERE product_id = p_product_id
    AND organization_id = p_organization_id
    AND status <> 'paid';

  IF open_accounts > 0 THEN
    -- Código propio para que la interfaz pueda decir qué pasa en vez de
    -- "ocurrió un error inesperado". Postgres no usa la clase LM.
    RAISE EXCEPTION 'Product has % unpaid credit accounts', open_accounts
      USING ERRCODE = 'LM001';
  END IF;

  RETURN QUERY
  UPDATE products
  SET retired_at = COALESCE(retired_at, NOW())
  WHERE id = p_product_id AND organization_id = p_organization_id
  RETURNING products.*;
END;
$BODY$;

-- Misma postura que el resto: el navegador no llama nada de esto.
REVOKE ALL ON FUNCTION retire_product(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION retire_product(UUID, INTEGER) TO service_role;

COMMENT ON FUNCTION retire_product(UUID, INTEGER) IS
  'Retira un producto del catálogo. Falla con LM001 si tiene fiados sin pagar.';
