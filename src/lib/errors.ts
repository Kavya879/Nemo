/**
 * Custom error classes + a central error handler.
 *
 * Services and repositories throw these typed errors. The API layer catches
 * them with `toErrorResponse` so every route returns a consistent JSON envelope
 * and the right HTTP status — never a raw stack trace, never a generic 500 for
 * something that's really a 400.
 */

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  /** Optional machine-readable detail (e.g. Zod issues). */
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    // Restore prototype chain (needed when targeting ES5/ES2015 down-levels).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 — input failed validation. */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
}

/** 404 — a requested resource does not exist. */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";
}

/** 409 — the request conflicts with current state. */
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";
}

/** 502 — an upstream dependency (e.g. Bedrock) failed. */
export class UpstreamError extends AppError {
  readonly statusCode = 502;
  readonly code = "UPSTREAM_ERROR";
}

/** 500 — unexpected internal failure. */
export class InternalError extends AppError {
  readonly statusCode = 500;
  readonly code = "INTERNAL_ERROR";
}

export interface ErrorResponseBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Maps any thrown value to a consistent error envelope + status code.
 * Known AppErrors are surfaced faithfully; everything else is masked as a 500
 * (so we never leak internals) while still being logged for debugging.
 */
export function toErrorResponse(error: unknown): {
  status: number;
  body: ErrorResponseBody;
} {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
    };
  }

  // Unknown error — log the real thing, return a safe generic message.
  // eslint-disable-next-line no-console
  console.error("[unhandled-error]", error);

  return {
    status: 500,
    body: {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    },
  };
}
