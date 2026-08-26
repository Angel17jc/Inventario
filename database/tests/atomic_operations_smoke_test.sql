-- Manual smoke test for the transactional inventory functions, as they stand
-- after 010 (stock may go negative) and 014 (quantities arrive in presentations).
-- It never persists data: every change is rolled back at the end.

BEGIN;

DO $$
DECLARE
  test_organization_id UUID;
  test_product_id INTEGER;
  test_pack_id INTEGER;
  original_quantity INTEGER;
  final_quantity INTEGER;
BEGIN
  SELECT organization_id, id, quantity
  INTO test_organization_id, test_product_id, original_quantity
  FROM products
  ORDER BY id
  LIMIT 1;

  IF test_product_id IS NULL THEN
    RAISE EXCEPTION 'Smoke test requires at least one product';
  END IF;

  -- A movement in loose units moves the stock by exactly what was asked for.
  PERFORM create_inventory_movement(
    test_organization_id,
    test_product_id,
    'IN',
    1,
    'Atomic operation smoke test',
    NULL
  );

  SELECT quantity INTO final_quantity
  FROM products
  WHERE id = test_product_id AND organization_id = test_organization_id;
  IF final_quantity <> original_quantity + 1 THEN
    RAISE EXCEPTION 'Expected stock %, got %', original_quantity + 1, final_quantity;
  END IF;

  -- A presentation multiplies, and the multiplication happens here rather than
  -- in the caller, with the product row already locked.
  INSERT INTO product_packs (organization_id, product_id, label, units)
  VALUES (test_organization_id, test_product_id, 'Caja de prueba', 12)
  ON CONFLICT (product_id, units) DO UPDATE SET label = EXCLUDED.label
  RETURNING id INTO test_pack_id;

  PERFORM create_inventory_movement(
    test_organization_id,
    test_product_id,
    'OUT',
    2,
    'Presentation smoke test',
    NULL,
    test_pack_id
  );

  SELECT quantity INTO final_quantity
  FROM products
  WHERE id = test_product_id AND organization_id = test_organization_id;
  IF final_quantity <> original_quantity + 1 - 24 THEN
    RAISE EXCEPTION 'Expected 2 cases of 12 to take 24 units, stock is %', final_quantity;
  END IF;

  -- Selling beyond what the count holds is allowed on purpose: a shop that has
  -- the bottle in its hand sells it, and the register says so afterwards.
  -- The stock is set to a known figure first so the expectation below does not
  -- depend on how much of the product the shop happened to have.
  PERFORM create_inventory_movement(
    test_organization_id, test_product_id, 'ADJUSTMENT', 10,
    'Setting a known figure for the smoke test', NULL
  );

  PERFORM create_inventory_movement(
    test_organization_id,
    test_product_id,
    'OUT',
    15,
    'Selling beyond the recorded stock',
    NULL
  );

  SELECT quantity INTO final_quantity
  FROM products
  WHERE id = test_product_id AND organization_id = test_organization_id;
  IF final_quantity <> -5 THEN
    RAISE EXCEPTION 'Expected the stock to be left at -5, got %', final_quantity;
  END IF;

  -- A presentation belonging to another shop must not be usable here.
  BEGIN
    PERFORM create_inventory_movement(
      test_organization_id,
      test_product_id,
      'OUT',
      1,
      'Unknown presentation smoke test',
      NULL,
      -1
    );
    RAISE EXCEPTION 'Expected an unknown presentation to be rejected';
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    NULL;
  END;
END;
$$;

ROLLBACK;
