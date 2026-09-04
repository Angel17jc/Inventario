import test from "node:test";
import assert from "node:assert/strict";
import { withoutPersonalData } from "./request-log.js";

test("the customer name never reaches the request log", () => {
  assert.equal(
    withoutPersonalData("/api/credits/customer/Juan%20P%C3%A9rez"),
    "/api/credits/customer/:customerName",
  );
  // A name with a slash in it still ends at the parameter, not halfway.
  assert.equal(
    withoutPersonalData("/api/credits/customer/Ana/Mar%C3%ADa"),
    "/api/credits/customer/:customerName",
  );
});

test("every other path is logged as it arrived", () => {
  for (const path of ["/api/products", "/api/credits", "/api/credits/stats", "/api/movimientos/historial"]) {
    assert.equal(withoutPersonalData(path), path);
  }
});
