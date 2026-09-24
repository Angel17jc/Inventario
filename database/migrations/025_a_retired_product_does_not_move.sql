-- Un producto retirado no se vende, no se fía y no se le corrige el stock.
--
-- retire_product (017) marca retired_at en vez de borrar, para que el historial
-- conserve a qué producto se refería cada venta. Desde entonces el producto
-- desaparece de todas las pantallas, pero las tres funciones que mueven stock
-- lo seguían buscando solo por id y organización: una llamada directa a la API
-- podía venderlo, fiarlo o cambiarle la cantidad, y dejar movimientos de algo
-- que la licorería ya había sacado del catálogo.
--
-- Cada función distingue ahora los dos casos:
--   - P0002: el producto no existe en esta licorería (como hasta ahora).
--   - LM002: existe, pero está retirado. Código propio, como LM001, para que la
--     API pueda decir "ese producto está retirado" en vez de "no existe".
--
-- La comprobación va después del FOR UPDATE: retire_product bloquea la misma
-- fila, así que un retiro y una venta simultáneos no pueden cruzarse.
--
-- Funciona con el código ya desplegado: las firmas no cambian y CREATE OR
-- REPLACE conserva los permisos (solo service_role las ejecuta). Un backend que
-- aún no conozca LM002 lo contestará como error inesperado, que solo alcanza
-- quien llame a la API a mano con un producto retirado.

CREATE OR REPLACE FUNCTION public.create_sale(p_organization_id uuid, p_items jsonb, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(sale_id uuid, total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item JSONB;
  v_sale_id UUID := gen_random_uuid();
  v_total NUMERIC(10,2) := 0;
  v_product_id INTEGER;
  v_quantity INTEGER;
  unit_price NUMERIC(10,2);
  line_amount NUMERIC(10,2);
  v_retired_at TIMESTAMPTZ;
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
    SELECT selling_price, retired_at INTO unit_price, v_retired_at
    FROM products
    WHERE id = v_product_id AND organization_id = p_organization_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
    END IF;
    IF v_retired_at IS NOT NULL THEN
      RAISE EXCEPTION 'Product % is retired', v_product_id USING ERRCODE = 'LM002';
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
$function$;

CREATE OR REPLACE FUNCTION public.create_credit_sale(p_organization_id uuid, p_product_id integer, p_customer_name text, p_quantity integer, p_notes text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF credit_accounts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  unit_price NUMERIC(10,2);
  movement_record movements;
  total NUMERIC(10,2);
  v_retired_at TIMESTAMPTZ;
BEGIN
  IF length(trim(p_customer_name)) = 0 THEN
    RAISE EXCEPTION 'Customer name is required' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'Credit sale quantity must be greater than zero' USING ERRCODE = '22023';
  END IF;

  SELECT selling_price, retired_at INTO unit_price, v_retired_at
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
  END IF;
  IF v_retired_at IS NOT NULL THEN
    RAISE EXCEPTION 'Product % is retired', p_product_id USING ERRCODE = 'LM002';
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
$function$;

CREATE OR REPLACE FUNCTION public.set_product_stock(p_organization_id uuid, p_product_id integer, p_quantity integer, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF movements
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_quantity INTEGER;
  difference INTEGER;
  v_retired_at TIMESTAMPTZ;
BEGIN
  SELECT quantity, retired_at INTO current_quantity, v_retired_at
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found in organization' USING ERRCODE = 'P0002';
  END IF;
  IF v_retired_at IS NOT NULL THEN
    RAISE EXCEPTION 'Product % is retired', p_product_id USING ERRCODE = 'LM002';
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
$function$;
