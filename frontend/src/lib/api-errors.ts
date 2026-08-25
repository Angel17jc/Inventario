import { errorCodes, type ApiErrorBody, type ErrorCode } from "@shared/errors";

/**
 * A failure the API described. It extends Error so anything already reading
 * `error.message` keeps working, and carries the code so behaviour can depend
 * on what went wrong rather than on the wording.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === "object" && body !== null && "message" in body && typeof (body as ApiErrorBody).message === "string";
}

/**
 * Turns a failed response into an ApiError and throws it. The fallback covers
 * responses with no usable body — a gateway timeout, an HTML error page — so
 * the caller still gets a sentence that names the operation that failed.
 */
export async function throwApiError(response: Response, fallbackMessage: string): Promise<never> {
  let code: ErrorCode = errorCodes.unexpected;
  let message = fallbackMessage;

  try {
    const body: unknown = await response.json();
    if (isErrorBody(body)) {
      message = body.message;
      if (body.code) code = body.code;
    }
  } catch {
    // A response that is not JSON tells us nothing beyond its status.
  }

  if (code === errorCodes.unexpected) {
    if (response.status === 401) code = errorCodes.sessionExpired;
    else if (response.status === 403) code = errorCodes.forbidden;
    else if (response.status === 404) code = errorCodes.notFound;
    else if (response.status === 409) code = errorCodes.conflict;
  }

  throw new ApiError(response.status, code, message);
}

/** The connection failed before any response arrived. */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export function describeNetworkFailure() {
  return navigator.onLine
    ? "No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo de nuevo."
    : "Parece que no tienes conexión a internet. Los cambios no se guardaron.";
}

/**
 * The single place that turns anything thrown anywhere into something worth
 * showing a person. Pages call this instead of reaching for `error.message`,
 * which may hold a stack, a status line or nothing at all.
 */
export function describeError(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof NetworkError) return error.message;
  // fetch rejects with a TypeError when the request never reached the server.
  if (error instanceof TypeError) return describeNetworkFailure();
  return fallbackMessage;
}

/** True when signing in again is what the person needs to do. */
export function isSessionExpired(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === errorCodes.sessionExpired || error.code === errorCodes.unauthenticated)
  );
}
