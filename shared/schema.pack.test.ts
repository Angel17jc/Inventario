import assert from "node:assert/strict";
import test from "node:test";
import { describeQuantity, hasPack, packPriceOf, toBaseUnits, type ProductPackaging } from "./schema.js";

const caseOf24: ProductPackaging = {
  unitLabel: "botella",
  unitsPerPack: 24,
  packLabel: "caja",
  packPrice: null,
  sellingPrice: "1.50",
};

const loneBottle: ProductPackaging = {
  unitLabel: "botella",
  unitsPerPack: null,
  packLabel: null,
  packPrice: null,
  sellingPrice: "18.00",
};

test("a pack exists only once it has a size", () => {
  assert.equal(hasPack(caseOf24), true);
  assert.equal(hasPack(loneBottle), false);
  assert.equal(hasPack({ unitsPerPack: 1 }), false);
});

test("selling by the pack takes its size out of the stock", () => {
  assert.equal(toBaseUnits(1, "pack", caseOf24), 24);
  assert.equal(toBaseUnits(3, "pack", caseOf24), 72);
  assert.equal(toBaseUnits(5, "unit", caseOf24), 5);
});

test("a product with no pack is unaffected by how it was entered", () => {
  assert.equal(toBaseUnits(2, "pack", loneBottle), 2);
  assert.equal(toBaseUnits(2, "unit", loneBottle), 2);
});

test("a pack with no price of its own costs its size times the unit price", () => {
  assert.equal(packPriceOf(caseOf24), 36);
});

test("a pack price set by the shop wins over the multiplication", () => {
  assert.equal(packPriceOf({ ...caseOf24, packPrice: "30.00" }), 30);
});

test("quantities read in the words the shop uses", () => {
  assert.equal(describeQuantity(1, "pack", caseOf24), "1 caja");
  assert.equal(describeQuantity(3, "pack", caseOf24), "3 cajas");
  assert.equal(describeQuantity(1, "unit", caseOf24), "1 botella");
  assert.equal(describeQuantity(6, "unit", caseOf24), "6 botellas");
});
