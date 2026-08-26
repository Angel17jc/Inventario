import assert from "node:assert/strict";
import test from "node:test";
import { chargeFor, describeQuantity, describeSale, priceOf, toBaseUnits, unitCostOf, type Presentation } from "./schema.js";

const caseOfTwelve: Presentation = { id: 1, label: "Caja de 12", units: 12, cost: "17.00", price: null };
const caseOfSix: Presentation = { id: 2, label: "Caja de 6", units: 6, cost: null, price: "95.00" };

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

test("a case cost divides into what one unit cost the shop", () => {
  // A case of twelve at 17.00 puts each bottle at 1.4166..., which is what the
  // stock is valued at, not the 24.00 it is sold for.
  assert.equal(unitCostOf(caseOfTwelve, "9.99").toFixed(4), "1.4167");
});

test("a presentation with no cost of its own falls back to the product's unit cost", () => {
  assert.equal(unitCostOf(caseOfSix, "2.50"), 2.5);
  assert.equal(unitCostOf(null, "2.50"), 2.5);
});

test("a sale of cases and loose units charges each at its own price", () => {
  // One case of twelve plus six loose bottles: the case at its calculated
  // 12 x 2.00, the six bottles at 2.00 each.
  assert.equal(chargeFor(1, 6, caseOfTwelve, "2.00"), 36);
  // The shop's own case price wins, and the loose units are unaffected by it.
  assert.equal(chargeFor(1, 6, caseOfSix, "18.00"), 95 + 108);
});

test("a sale with no case is charged entirely by the unit", () => {
  assert.equal(chargeFor(0, 6, null, "2.00"), 12);
  assert.equal(chargeFor(3, 0, null, "2.00"), 0);
});

test("a sale of cases and loose units reads as both", () => {
  assert.equal(describeSale(1, 6, caseOfTwelve, "botella"), "1 × Caja de 12 + 6 botellas");
  assert.equal(describeSale(2, 2, caseOfTwelve, "botella"), "2 × Caja de 12 + 2 botellas");
});

test("whichever side of a sale is zero is left out", () => {
  assert.equal(describeSale(2, 0, caseOfTwelve, "botella"), "2 × Caja de 12");
  assert.equal(describeSale(0, 6, caseOfTwelve, "botella"), "6 botellas");
  assert.equal(describeSale(0, 1, null, "botella"), "1 botella");
});

test("cases and loose units add up in base units", () => {
  // Two cases of twelve and two loose bottles take twenty-six off the shelf.
  assert.equal(toBaseUnits(2, caseOfTwelve) + 2, 26);
});
