import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrganizationSchema,
} from "./platform-schemas.js";

test("normalizes valid organization creation input", () => {
  const input = createOrganizationSchema.parse({
    name: "  Licorería Central  ",
    ownerEmail: "owner@example.com",
    ownerPassword: "secure-password",
  });

  assert.equal(input.name, "Licorería Central");
  assert.equal(input.slug, "");
});

