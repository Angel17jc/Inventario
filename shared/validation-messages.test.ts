import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { createCreditAccountRequestSchema, createSaleRequestSchema, insertProductSchema } from "./schema.js";

function firstMessage(schema: z.ZodTypeAny, value: unknown): string {
  const parsed = schema.safeParse(value);
  assert.ok(!parsed.success, "the value was expected to be rejected");
  return parsed.error.errors[0].message;
}

// Each one of these reached a person in English on 23 September 2026.
test("the defaults Zod used to answer with are Spanish and name the field", () => {
  const line = (quantity: unknown) => ({ items: [{ productId: 1, quantity }] });
  assert.equal(firstMessage(createSaleRequestSchema, line(1.5)), "La cantidad debe ser un número entero.");
  assert.equal(firstMessage(createSaleRequestSchema, line("abc")), "La cantidad debe ser un número.");
  assert.equal(
    firstMessage(createSaleRequestSchema, { items: Array.from({ length: 101 }, () => ({ productId: 1, quantity: 1 })) }),
    "La venta no puede tener más de 100 elementos.",
  );
  assert.equal(
    firstMessage(createCreditAccountRequestSchema, { customerName: "A", productId: 1, quantity: 1 }),
    "El nombre del cliente debe tener al menos 2 caracteres.",
  );
  assert.equal(firstMessage(createCreditAccountRequestSchema, { productId: 1, quantity: 1 }), "Falta el nombre del cliente.");
});

test("a message a schema spells out itself is kept", () => {
  assert.equal(firstMessage(createSaleRequestSchema, { items: [] }), "Agrega al menos un producto.");
});

test("schemas generated from the tables get Spanish too", () => {
  assert.equal(firstMessage(insertProductSchema.pick({ name: true }), {}), "Falta el nombre.");
});

test("an unnamed field still reads as a sentence", () => {
  assert.equal(firstMessage(z.object({ misterio: z.number().positive() }), { misterio: 0 }), "Este dato debe ser mayor que 0.");
  assert.equal(firstMessage(z.object({ purchaseUnits: z.number() }), {}), "Faltan las unidades de la compra.");
});
