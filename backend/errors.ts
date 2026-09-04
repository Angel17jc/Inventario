import type { Response } from "express";
import { z } from "zod";
import { errorCodes, type ApiErrorBody, type ErrorCode } from "../shared/errors.js";

interface DatabaseError {
  code?: string;
  status?: number;
  statusCode?: number;
  message?: string;
}

interface ApiError extends ApiErrorBody {
  status: number;
}

/**
 * PostgreSQL states raised by the schema constraints and by the transactional
 * functions in database/migrations/005. Named here so the mapping below reads
 * as intent rather than as a list of magic numbers.
 */
const postgresStates = {
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
  noDataFound: "P0002",
  raisedException: "22000",
  invalidParameter: "22023",
  /**
   * Ours, raised by retire_product in migration 017. Postgres does not use the
   * LM class, so a rule this application enforces can say what it is instead
   * of arriving as one more unexplained failure.
   */
  productHasUnpaidCredits: "LM001",
} as const;

export function getApiError(error: unknown): ApiError {
  if (error instanceof z.ZodError) {
    return {
      status: 400,
      code: errorCodes.validation,
      message: error.errors[0]?.message ?? "Revisa los datos del formulario.",
    };
  }

  const databaseError = error as DatabaseError;

  switch (databaseError.code) {
    case postgresStates.uniqueViolation:
      return {
        status: 409,
        code: errorCodes.conflict,
        message: "Ya existe un registro con estos datos.",
      };
    case postgresStates.foreignKeyViolation:
      return {
        status: 409,
        code: errorCodes.conflict,
        message: "No se puede completar: hay otros registros que dependen de este.",
      };
    case postgresStates.noDataFound:
      return {
        status: 404,
        code: errorCodes.notFound,
        message: "No encontramos el registro solicitado.",
      };
    case postgresStates.raisedException:
      // Raised by the transactional functions for a rule they enforce
      // themselves. The wording is not shown, only that the operation was
      // refused.
      return {
        status: 400,
        code: errorCodes.validation,
        message: "No se pudo completar la operación con los datos indicados.",
      };
    case postgresStates.invalidParameter:
      return {
        status: 400,
        code: errorCodes.validation,
        message: "Los datos enviados no son válidos.",
      };
    case postgresStates.productHasUnpaidCredits:
      return {
        status: 409,
        code: errorCodes.productHasUnpaidCredits,
        message: "No puedes retirar este producto: tiene fiados sin pagar. Cóbralos primero.",
      };
  }

  // Nothing recognised the failure, so it is ours: the caller learns that it
  // went wrong and nothing more, while the stack stays in the server logs.
  return {
    status: databaseError.status ?? databaseError.statusCode ?? 500,
    code: errorCodes.unexpected,
    message: "Ocurrió un error inesperado. Vuelve a intentarlo en unos momentos.",
  };
}

export function sendApiError(response: Response, error: unknown) {
  const { status, code, message } = getApiError(error);
  return response.status(status).json({ code, message });
}

/** Shorthand for the explicit failures the route handlers raise themselves. */
export function fail(response: Response, status: number, code: ErrorCode, message: string) {
  return response.status(status).json({ code, message } satisfies ApiErrorBody);
}
