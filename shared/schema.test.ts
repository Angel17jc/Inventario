import assert from "node:assert/strict";
import test from "node:test";
import {
  createCreditAccountRequestSchema,
  createCreditPaymentRequestSchema,
  createCategoryRequestSchema,
  createSupplierRequestSchema,
  createMovementRequestSchema,
  accountPasswordSchema,
  passwordRules,
} from "./schema.js";

test("accepts a valid stock movement", () => {
  const movement = createMovementRequestSchema.parse({ productId: "7", type: "OUT", quantity: "2", reason: "Venta" });
  assert.deepEqual(movement, { productId: 7, type: "OUT", quantity: 2, looseQuantity: 0, reason: "Venta" });
});

test("accepts cases and loose units in the same sale", () => {
  // Two cases and two bottles is one sale, and so is six bottles on their own.
  const mixed = createMovementRequestSchema.parse({ productId: 7, type: "OUT", quantity: 2, looseQuantity: 2, packId: 3 });
  assert.equal(mixed.quantity, 2);
  assert.equal(mixed.looseQuantity, 2);
  assert.equal(createMovementRequestSchema.parse({ productId: 7, type: "OUT", quantity: 0, looseQuantity: 6 }).looseQuantity, 6);
});

test("rejects invalid stock movement quantities and types", () => {
  assert.throws(() => createMovementRequestSchema.parse({ productId: 1, type: "DELETE", quantity: 1 }));
  // Nothing on either side is not a sale.
  assert.throws(() => createMovementRequestSchema.parse({ productId: 1, type: "OUT", quantity: 0 }));
  assert.throws(() => createMovementRequestSchema.parse({ productId: 1, type: "OUT", quantity: 0, looseQuantity: 0 }));
  assert.throws(() => createMovementRequestSchema.parse({ productId: 1, type: "OUT", quantity: -1, looseQuantity: 2 }));
});

test("validates credit sales before inventory is affected", () => {
  const credit = createCreditAccountRequestSchema.parse({ customerName: "María Pérez", productId: 4, quantity: 3 });
  assert.equal(credit.customerName, "María Pérez");
  assert.throws(() => createCreditAccountRequestSchema.parse({ customerName: "", productId: 4, quantity: 3 }));
  assert.throws(() => createCreditAccountRequestSchema.parse({ customerName: "María Pérez", productId: 4, quantity: 0 }));
});

test("normalizes payment amounts and rejects invalid values", () => {
  const payment = createCreditPaymentRequestSchema.parse({ creditAccountId: "9", amount: "12.5", paymentMethod: "Efectivo" });
  assert.equal(payment.amount, "12.50");
  assert.throws(() => createCreditPaymentRequestSchema.parse({ creditAccountId: 9, amount: -1 }));
});

test("validates category names before they reach the API", () => {
  assert.deepEqual(createCategoryRequestSchema.parse({ name: "  Cervezas  ", description: "  Nacionales  " }), { name: "Cervezas", description: "Nacionales" });
  assert.throws(() => createCategoryRequestSchema.parse({ name: " " }));
});

test("validates supplier names and contact field limits", () => {
  assert.equal(createSupplierRequestSchema.parse({ name: "Distribuidora Norte", contactInfo: "0990000000" }).name, "Distribuidora Norte");
  assert.throws(() => createSupplierRequestSchema.parse({ name: "A" }));
  assert.throws(() => createSupplierRequestSchema.parse({ name: "Proveedor", contactInfo: "x".repeat(256) }));
});

test("accepts passwords with six characters and a digit or symbol", () => {
  assert.deepEqual(accountPasswordSchema.parse("abc123"), "abc123");
  assert.deepEqual(accountPasswordSchema.parse("abcde!"), "abcde!");
});

test("rejects passwords that are too short or have only letters", () => {
  assert.throws(() => accountPasswordSchema.parse("abc12"));
  assert.throws(() => accountPasswordSchema.parse("abcdefgh"));
  assert.throws(() => accountPasswordSchema.parse("a".repeat(129) + "1"));
});

test("the rules shown in the browser agree with the schema", () => {
  for (const candidate of ["abc123", "abcde!", "abc12", "abcdefgh", ""]) {
    const allRulesMet = passwordRules.every((rule) => rule.isMet(candidate));
    const schemaAccepts = accountPasswordSchema.safeParse(candidate).success;
    assert.equal(allRulesMet, schemaAccepts, `mismatch for ${JSON.stringify(candidate)}`);
  }
});
