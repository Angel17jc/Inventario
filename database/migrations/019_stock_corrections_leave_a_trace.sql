-- Corregir el stock a mano dejaba de existir en cuanto se guardaba.
--
-- Cuando la compra pasó a anotarse editando el producto, la actualización
-- escribía products.quantity directamente. Nada quedaba registrado: el historial
-- prometía "todo lo que entra y sale" y no mostraba nada de lo que entraba, la
-- barra de entradas del panel estaba clavada en cero, y cualquiera podía
-- reescribir las existencias sin dejar huella. Si el conteo no cuadraba, no
-- había forma de saber si fue una venta, una rotura o un dedo torpe.
--
-- Ahora se pasa por una función que fija la cantidad y anota el movimiento que
-- la explica, con la fila bloqueada, de modo que las dos cosas ocurren juntas o
-- no ocurre ninguna.

CREATE OR REPLACE FUNCTION set_product_stock(
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

  -- Guardar el mismo número que ya había no es un movimiento. Editar el precio
  -- de un producto reenvía la cantidad sin querer cambiarla, y una fila por cada
  -- una de esas ediciones llenaría el historial de ruido.
  IF difference = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO movements (
    organization_id, product_id, type, quantity, reason, user_id,
    pack_id, entered_quantity, loose_quantity
  )
  VALUES (
    p_organization_id,
    p_product_id,
    CASE WHEN difference > 0 THEN 'IN' ELSE 'OUT' END,
    abs(difference),
    CASE WHEN difference > 0 THEN 'Ingreso de mercadería' ELSE 'Ajuste de conteo' END,
    p_user_id::VARCHAR,
    NULL,
    NULL,
    abs(difference)
  )
  RETURNING movements.*;
END;
$BODY$;

REVOKE ALL ON FUNCTION set_product_stock(UUID, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_product_stock(UUID, INTEGER, INTEGER, UUID) TO service_role;

COMMENT ON FUNCTION set_product_stock IS
  'Fija las existencias de un producto y anota el movimiento que lo explica. La diferencia decide si es entrada o salida.';

-- La vista nunca se usó: la pantalla de fiados agrupa por cliente en el
-- navegador. Una vista que nadie consulta se desvía de la realidad en silencio
-- hasta que alguien la usa y obtiene un número equivocado.
DROP VIEW IF EXISTS customer_debts;
