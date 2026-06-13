import { z } from "zod";
import { ValidationError } from "@/lib/errors";

/**
 * Validation helpers for the API boundary. Routes call these so a bad input
 * becomes a clean ValidationError (→ 400), never an unhandled crash.
 *
 * Using `S extends z.ZodTypeAny` + `z.infer<S>` returns the schema's OUTPUT type
 * (with `.default()`s applied), so callers get fully-resolved, non-optional values.
 */

export function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("Invalid request input.", result.error.issues);
  }
  return result.data;
}

/** Parses a JSON request body, mapping malformed JSON to a 400. */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
  return parse(schema, body);
}

/** Parses URL query params into an object, then validates. */
export function parseQuery<S extends z.ZodTypeAny>(url: string, schema: S): z.infer<S> {
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  return parse(schema, params);
}
