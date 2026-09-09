import assert from "node:assert/strict";
import test from "node:test";
import {
  createCreditAccountRequestSchema,
  createCreditPaymentRequestSchema,
  createCategoryRequestSchema,
  createSupplierRequestSchema,
  createSaleRequestSchema,
  accountPasswordSchema,
  passwordRules,
} from "./schema.js";

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

test("accepts passwords of eight characters with a digit or symbol", () => {
  assert.deepEqual(accountPasswordSchema.parse("abc12345"), "abc12345");
  assert.deepEqual(accountPasswordSchema.parse("abcdefg!"), "abcdefg!");
});

test("rejects passwords that are too short or have only letters", () => {
  // Seven characters used to be enough; NIST asks for eight.
  assert.throws(() => accountPasswordSchema.parse("abc1234"));
  assert.throws(() => accountPasswordSchema.parse("abcdefgh"));
  assert.throws(() => accountPasswordSchema.parse("a".repeat(129) + "1"));
});

test("the rules shown in the browser agree with the schema", () => {
  for (const candidate of ["abc12345", "abcdefg!", "abc1234", "abcdefgh", "abc123", ""]) {
    const allRulesMet = passwordRules.every((rule) => rule.isMet(candidate));
    const schemaAccepts = accountPasswordSchema.safeParse(candidate).success;
    assert.equal(allRulesMet, schemaAccepts, `mismatch for ${JSON.stringify(candidate)}`);
  }
});

test("a sale carries several products at once", () => {
  const sale = createSaleRequestSchema.parse({
    items: [
      { productId: 1, quantity: 2 },
      { productId: 4, quantity: 1 },
    ],
  });
  assert.equal(sale.items.length, 2);
  assert.equal(sale.items[0].quantity, 2);
  assert.equal(sale.items[1].productId, 4);
});

test("a sale with no lines, or a line with nothing in it, is refused", () => {
  assert.throws(() => createSaleRequestSchema.parse({ items: [] }));
  assert.throws(() => createSaleRequestSchema.parse({ items: [{ productId: 1, quantity: 0 }] }));
  assert.throws(() => createSaleRequestSchema.parse({ items: [{ productId: 0, quantity: 1 }] }));
});

test("a sale is bounded so one request cannot carry a catalogue", () => {
  const line = { productId: 1, quantity: 1 };
  assert.doesNotThrow(() => createSaleRequestSchema.parse({ items: Array(100).fill(line) }));
  assert.throws(() => createSaleRequestSchema.parse({ items: Array(101).fill(line) }));
});
