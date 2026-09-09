-- Comprobación manual de las funciones transaccionales, tal como quedaron tras
-- la 021: se vende por unidad y el stock puede quedar negativo.
-- No conserva nada: todo se deshace con el ROLLBACK del final.

BEGIN;

DO $$
DECLARE
  test_organization_id UUID;
  test_product_id INTEGER;
  original_quantity INTEGER;
  final_quantity INTEGER;
  venta RECORD;
BEGIN
  SELECT organization_id, id, quantity
  INTO test_organization_id, test_product_id, original_quantity
  FROM products
  WHERE retired_at IS NULL
  ORDER BY id
  LIMIT 1;

  IF test_product_id IS NULL THEN
    RAISE EXCEPTION 'La prueba necesita al menos un producto activo';
  END IF;

  -- 1. Fijar el stock anota el movimiento que lo explica.
  PERFORM set_product_stock(test_organization_id, test_product_id, 40);

  SELECT quantity INTO final_quantity
  FROM products
  WHERE id = test_product_id AND organization_id = test_organization_id;
  IF final_quantity <> 40 THEN
    RAISE EXCEPTION 'Se esperaba un stock de 40, hay %', final_quantity;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM movements
    WHERE product_id = test_product_id
      AND organization_id = test_organization_id
      AND reason IN ('Ingreso de mercadería', 'Ajuste de conteo')
  ) THEN
    RAISE EXCEPTION 'Corregir el stock no dejó rastro en el historial';
  END IF;

  -- 2. Una venta descuenta lo que se vendió y devuelve su total.
  SELECT * INTO venta
  FROM create_sale(
    test_organization_id,
    jsonb_build_array(jsonb_build_object('productId', test_product_id, 'quantity', 12)),
    NULL
  );

  SELECT quantity INTO final_quantity
  FROM products
  WHERE id = test_product_id AND organization_id = test_organization_id;
  IF final_quantity <> 28 THEN
    RAISE EXCEPTION 'Se esperaba un stock de 28 tras vender 12, hay %', final_quantity;
  END IF;
  IF venta.total IS NULL OR venta.sale_id IS NULL THEN
    RAISE EXCEPTION 'La venta no devolvió identificador ni total';
  END IF;

  -- 3. Vender por encima de lo contado NO se rechaza: es decisión de producto.
  PERFORM create_sale(
    test_organization_id,
    jsonb_build_array(jsonb_build_object('productId', test_product_id, 'quantity', 33)),
    NULL
  );

  SELECT quantity INTO final_quantity
  FROM products
  WHERE id = test_product_id AND organization_id = test_organization_id;
  IF final_quantity <> -5 THEN
    RAISE EXCEPTION 'Se esperaba que el stock quedara en -5, hay %', final_quantity;
  END IF;

  -- 4. Un producto de otra licorería no se toca.
  BEGIN
    PERFORM create_sale(
      '00000000-0000-0000-0000-0000000000ff'::UUID,
      jsonb_build_array(jsonb_build_object('productId', test_product_id, 'quantity', 1)),
      NULL
    );
    RAISE EXCEPTION 'Se esperaba que rechazara un producto de otra organización';
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    NULL;
  END;

  -- 5. Una venta sin líneas no es una venta.
  BEGIN
    PERFORM create_sale(test_organization_id, '[]'::JSONB, NULL);
    RAISE EXCEPTION 'Se esperaba que rechazara una venta vacía';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
END;
$$;

ROLLBACK;
