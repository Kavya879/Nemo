import { z } from "zod";
import { GRADES, ROUTING_PATHS } from "@/config/constants";

/**
 * Shared TypeScript types & Zod schemas used across layers.
 *
 * These are the vocabulary of the domain. Services speak in these types;
 * the API layer validates inputs against the request schemas here. Phases add
 * to this file as new capabilities come online.
 */

// ── Core enums ────────────────────────────────────────────────────────────
export const GradeSchema = z.enum(GRADES);
export type Grade = z.infer<typeof GradeSchema>;

export const RoutingPathSchema = z.enum(ROUTING_PATHS);
export type RoutingPath = z.infer<typeof RoutingPathSchema>;

// ── Grading ───────────────────────────────────────────────────────────────
export const DetectedFlawSchema = z.object({
  type: z.string(), // e.g. "scratch", "stain", "missing-part"
  severity: z.enum(["minor", "moderate", "severe"]),
  location: z.string(), // human-readable, e.g. "top-left corner of screen"
});
export type DetectedFlaw = z.infer<typeof DetectedFlawSchema>;

/** The structured output every grader implementation must return. */
export const GradeResultSchema = z.object({
  grade: GradeSchema,
  confidence: z.number().min(0).max(1),
  flaws: z.array(DetectedFlawSchema),
  summary: z.string(),
  gradedBy: z.enum(["bedrock", "local"]),
  tookMs: z.number().int().nonnegative(),
});
export type GradeResult = z.infer<typeof GradeResultSchema>;

// ── Images ─────────────────────────────────────────────────────────────────
/** A product image as a base64 data string + mime type. */
export const ImageInputSchema = z.object({
  base64: z.string().min(1),
  mimeType: z
    .enum(["image/jpeg", "image/png", "image/webp"])
    .default("image/jpeg"),
});
export type ImageInput = z.infer<typeof ImageInputSchema>;

// ── Geo ──────────────────────────────────────────────────────────────────
export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;
