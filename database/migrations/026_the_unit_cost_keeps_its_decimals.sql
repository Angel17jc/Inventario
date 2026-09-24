-- El costo por unidad deja de redondearse a centavos.
--
-- Desde la 022 el costo se deriva de la compra: 24 cervezas por $17,00 dan
-- $0,708333 cada una. El servidor lo calculaba con cuatro decimales, pero
-- cost_price era NUMERIC(10,2) y lo guardaba como $0,71. Tres milésimas de más
-- en cada unidad no se notan en una venta, pero van siempre en la misma
-- dirección: la ganancia del panel sale más baja y el valor del inventario más
-- alto de lo que son, y la diferencia crece con cada unidad vendida.
--
-- NUMERIC(14,6): seis decimales dejan el error por debajo de un centavo cada
-- diez mil unidades, y los ocho enteros cubren el precio máximo que acepta la
-- API ($1.000.000 por una sola unidad).
--
-- Funciona con el código ya desplegado: escribe con cuatro decimales, que caben,
-- y los tipos generados siguen diciendo number.

ALTER TABLE products ALTER COLUMN cost_price TYPE NUMERIC(14,6);

-- Los costos ya guardados se recalculan desde la compra que los originó. Un
-- producto sin compra registrada conserva el costo que tenía: no hay de dónde
-- sacar uno mejor.
UPDATE products
SET cost_price = round(purchase_price / purchase_units, 6)
WHERE purchase_units > 0
  AND purchase_price IS NOT NULL;
