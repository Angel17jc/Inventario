import assert from "node:assert/strict";
import test from "node:test";
import { isPlatformAdmin } from "./tenancy.js";

test("only platform_role grants platform administration", () => {
  assert.equal(isPlatformAdmin({ platform_role: "platform_admin" }), true);
  assert.equal(isPlatformAdmin({ platform_role: "owner" }), false);
  assert.equal(isPlatformAdmin({}), false);
  assert.equal(isPlatformAdmin(undefined), false);
});

// The first release marked its administrator with role: "admin". Every account
// that had it also carries platform_role, so accepting it only kept alive a
// second way in that nobody granted on purpose.
test("the legacy role claim is not accepted", () => {
  assert.equal(isPlatformAdmin({ role: "admin" }), false);
});
