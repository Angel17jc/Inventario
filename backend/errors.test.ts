import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { getApiError } from "./errors.js";
import { errorCodes } from "../shared/errors.js";

test("maps database conflicts to HTTP 409", () => {
  assert.deepEqual(getApiError({ code: "23505" }), {
    status: 409,
    code: errorCodes.conflict,
    message: "Ya existe un registro con estos datos.",
  });
});

test("maps missing records to HTTP 404", () => {
  assert.deepEqual(getApiError({ code: "P0002" }), {
    status: 404,
    code: errorCodes.notFound,
    message: "No encontramos el registro solicitado.",
  });
});

test("does not expose unexpected error details", () => {
  const mapped = getApiError({ message: "database host details" });
  assert.equal(mapped.status, 500);
  assert.equal(mapped.code, errorCodes.unexpected);
  assert.ok(!mapped.message.includes("database host"));
});

test("refuses an operation the database rejected without repeating its wording", () => {
  const mapped = getApiError({ code: "22000", message: "Insufficient stock. Available: 3, requested: 10" });
  assert.equal(mapped.status, 400);
  assert.equal(mapped.code, errorCodes.validation);
  assert.ok(!mapped.message.includes("Insufficient"));
});

test("surfaces the first validation problem to the caller", () => {
  const schema = z.object({ name: z.string().min(2, "El nombre es demasiado corto.") });
  const parsed = schema.safeParse({ name: "a" });
  assert.ok(!parsed.success);
  assert.deepEqual(getApiError(parsed.error), {
    status: 400,
    code: errorCodes.validation,
    message: "El nombre es demasiado corto.",
  });
});
