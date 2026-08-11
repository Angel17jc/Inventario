import assert from "node:assert/strict";
import test from "node:test";
import {
  createCreditAccountRequestSchema,
  createCreditPaymentRequestSchema,
  createMovementRequestSchema,
} from "./schema";

test("accepts a valid stock movement", () => {
  const movement = createMovementRequestSchema.parse({ productId: "7", type: "OUT", quantity: "2", reason: "Venta" });
  assert.deepEqual(movement, { productId: 7, type: "OUT", quantity: 2, reason: "Venta" });
});

test("rejects invalid stock movement quantities and types", () => {
  assert.throws(() => createMovementRequestSchema.parse({ productId: 1, type: "DELETE", quantity: 1 }));
  assert.throws(() => createMovementRequestSchema.parse({ productId: 1, type: "OUT", quantity: 0 }));
});

test("validates credit sales before inventory is affected", () => {
  const credit = createCreditAccountRequestSchema.parse({ customerName: "María Pérez", productId: 4, quantity: 3 });
  assert.equal(credit.customerName, "María Pérez");
  assert.throws(() => createCreditAccountRequestSchema.parse({ customerName: "", productId: 4, quantity: 3 }));
});

test("normalizes payment amounts and rejects invalid values", () => {
  const payment = createCreditPaymentRequestSchema.parse({ creditAccountId: "9", amount: "12.5", paymentMethod: "Efectivo" });
  assert.equal(payment.amount, "12.50");
  assert.throws(() => createCreditPaymentRequestSchema.parse({ creditAccountId: 9, amount: -1 }));
});
