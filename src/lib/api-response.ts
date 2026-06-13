import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { API_VERSION } from "@/config/constants";

/**
 * Consistent API response envelopes.
 *
 * Every route returns either `{ ok: true, data }` or `{ ok: false, error }`.
 * The API layer is the only place that knows about HTTP; this helper keeps the
 * shape uniform so the typed frontend client can rely on it.
 */

export interface SuccessEnvelope<T> {
  ok: true;
  apiVersion: string;
  data: T;
}

export function ok<T>(data: T, status = 200): NextResponse {
  const body: SuccessEnvelope<T> = { ok: true, apiVersion: API_VERSION, data };
  return NextResponse.json(body, { status });
}

/**
 * Wraps any thrown value into the standard error envelope + status.
 * Routes call this in their catch block so error handling is identical everywhere.
 */
export function fail(error: unknown): NextResponse {
  const { status, body } = toErrorResponse(error);
  return NextResponse.json(body, { status });
}
