import assert from "node:assert/strict";
import test from "node:test";
import { createProductSchema, updateProductSchema } from "./inventory-schemas.js";

test("normalizes valid product input and an empty SKU", () => {
  const product = createProductSchema.parse({
    name: "  Ron Añejo  ",
    sku: "  ",
    quantity: "12",
    purchaseUnits: "24",
    purchasePrice: "17.00",
    sellingPrice: "16.75",
  });

  assert.equal(product.name, "Ron Añejo");
  assert.equal(product.sku, null);
  assert.equal(product.quantity, 12);
  assert.equal(product.purchaseUnits, 24);
  assert.equal(product.purchasePrice, 17);
});

test("drops the fields the product form stopped sending", () => {
  // Se aceptaban sin que nadie los escribiera ni los leyera. Que la petición
  // los traiga no debe volver a guardarlos.
  const product = createProductSchema.parse({
    name: "Ron Añejo",
    quantity: 1,
    costPrice: 1,
    sellingPrice: 2,
    minStockLevel: 3,
    description: "no se guarda",
    costPrice: 99,
  });
  assert.equal("minStockLevel" in product, false);
  assert.equal("description" in product, false);
  // El costo por unidad lo calcula el servidor: aceptarlo permitiría que la
  // valoración del inventario dijera algo distinto de lo que se pagó.
  assert.equal("costPrice" in product, false);
  assert.deepEqual(updateProductSchema.parse({ minStockLevel: 9, description: "x", costPrice: 1 }), {});
});

test("rejects invalid stock, prices, and catalog references", () => {
  const baseProduct = { name: "Vodka", quantity: 1, sellingPrice: 8 };
  assert.throws(() => createProductSchema.parse({ ...baseProduct, quantity: -1 }));
  assert.throws(() => createProductSchema.parse({ ...baseProduct, sellingPrice: -1 }));
  assert.throws(() => createProductSchema.parse({ ...baseProduct, categoryId: 0 }));
});

test("allows partial product updates", () => {
  assert.deepEqual(updateProductSchema.parse({ sellingPrice: "18.50" }), { sellingPrice: 18.5 });
  assert.deepEqual(updateProductSchema.parse({}), {});
});
