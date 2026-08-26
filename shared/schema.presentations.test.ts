import assert from "node:assert/strict";
import test from "node:test";
import { describeQuantity, priceOf, toBaseUnits, type Presentation } from "./schema.js";

const caseOfTwelve: Presentation = { id: 1, label: "Caja de 12", units: 12, price: null };
const caseOfSix: Presentation = { id: 2, label: "Caja de 6", units: 6, price: "95.00" };

test("the same product can leave the counter in more than one presentation", () => {
  assert.equal(toBaseUnits(1, caseOfTwelve), 12);
  assert.equal(toBaseUnits(1, caseOfSix), 6);
  assert.equal(toBaseUnits(2, caseOfSix), 12);
});

test("loose units are taken as they are entered", () => {
  assert.equal(toBaseUnits(5, null), 5);
});

test("a presentation with no price of its own costs its size times the unit price", () => {
  assert.equal(priceOf(caseOfTwelve, "1.50"), 18);
});

test("a price set by the shop wins over the multiplication", () => {
  assert.equal(priceOf(caseOfSix, "18.00"), 95);
});

test("a loose unit is charged at the unit price", () => {
  assert.equal(priceOf(null, "18.00"), 18);
});

test("quantities read in the words the shop chose", () => {
  assert.equal(describeQuantity(2, caseOfTwelve, "botella"), "2 × Caja de 12");
  assert.equal(describeQuantity(1, null, "botella"), "1 botella");
  assert.equal(describeQuantity(6, null, "botella"), "6 botellas");
});
