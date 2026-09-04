/**
 * The vocabulary both sides use to talk about failures.
 *
 * The API answers with a code as well as a message. The message is what a
 * person reads; the code is what the interface reacts to, so behaviour never
 * depends on matching prose that a translation or a reword would break.
 */
export const errorCodes = {
  /** No credentials were sent. */
  unauthenticated: "unauthenticated",
  /** Credentials were sent but are no longer valid: signing in again fixes it. */
  sessionExpired: "session_expired",
  /** Authenticated, but this account may not perform the operation. */
  forbidden: "forbidden",
  /** The request did not identify which business it applies to. */
  organizationRequired: "organization_required",
  /** The business exists but has been suspended. */
  organizationSuspended: "organization_suspended",
  /** The record does not exist, or belongs to another business. */
  notFound: "not_found",
  /** The operation collides with existing data, such as a repeated SKU. */
  conflict: "conflict",
  /** The product still has fiados nobody has paid, so it cannot be retired. */
  productHasUnpaidCredits: "product_has_unpaid_credits",
  /** The submitted values did not pass validation. */
  validation: "validation",
  /** Anything the server did not anticipate. */
  unexpected: "unexpected",
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

/** The body every failed API response carries. */
export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
}
