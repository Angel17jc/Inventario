# Pruebas

## Pruebas automáticas

Ejecuta antes de cada entrega:

```bash
npm test
npm run check
npm run build
```

Las pruebas unitarias cubren contratos de validación y el mapeo seguro de errores de API.

## Prueba de operaciones atómicas

Después de aplicar las migraciones, ejecuta [atomic_operations_smoke_test.sql](database/tests/atomic_operations_smoke_test.sql) en el SQL Editor de Supabase. Requiere al menos un producto.

Comprueba cuatro cosas sobre las funciones transaccionales:

1. Una entrada mueve el stock por lo que se pidió.
2. Una salida de 2 cajas de 12 descuenta **24 unidades**, no 2. La multiplicación ocurre dentro de la función, con la fila del producto bloqueada.
3. Vender por encima de lo contado **no se rechaza**: el stock queda en negativo. Es una decisión de producto, no un descuido — si el tendero tiene la botella en la mano, la vende.
4. Una presentación que no pertenece al producto se rechaza.

Usa `BEGIN` y `ROLLBACK`, así que no conserva cambios en inventario ni historial.
