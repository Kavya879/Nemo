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
  gradedBy: z.enum(["bedrock", "local", "clip"]),
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

/** What a given photo depicts — drives multi-image verification coverage. */
export const ImageRoleSchema = z.enum([
  "front",
  "back",
  "side",
  "packaging",
  "defect",
  "other",
]);
export type ImageRole = z.infer<typeof ImageRoleSchema>;

/** An image tagged with the angle/aspect it captures. */
export const RoledImageInputSchema = ImageInputSchema.extend({
  role: ImageRoleSchema.default("other"),
});
export type RoledImageInput = z.infer<typeof RoledImageInputSchema>;

// ── Pre-grade product verification ──────────────────────────────────────────
/** Per-dimension match scores (0..1) of the uploaded item vs the catalog product. */
export const AttributeMatchSchema = z.object({
  category: z.number().min(0).max(1),
  brand: z.number().min(0).max(1),
  model: z.number().min(0).max(1),
  packaging: z.number().min(0).max(1),
  visual: z.number().min(0).max(1),
});
export type AttributeMatch = z.infer<typeof AttributeMatchSchema>;

/** An observed mismatch between the uploaded item and the expected product. */
export const VerificationDeviationSchema = z.object({
  attribute: z.string(),
  detail: z.string(),
  severity: z.enum(["minor", "moderate", "severe"]),
});
export type VerificationDeviation = z.infer<typeof VerificationDeviationSchema>;

export const VerificationRecommendationSchema = z.enum([
  "PROCEED",
  "REQUEST_EVIDENCE",
  "MANUAL_REVIEW",
]);
export type VerificationRecommendationT = z.infer<
  typeof VerificationRecommendationSchema
>;

/** What a verifier implementation must return (timing/recommendation added later). */
export const VerifierOutputSchema = z.object({
  productMatchConfidence: z.number().min(0).max(1),
  fraudRiskScore: z.number().min(0).max(1),
  attributes: AttributeMatchSchema,
  deviations: z.array(VerificationDeviationSchema),
  summary: z.string().min(1),
});
export type VerifierOutput = z.infer<typeof VerifierOutputSchema>;

/** The full persisted verification assessment (verifier output + gate decision). */
export const VerificationAssessmentSchema = VerifierOutputSchema.extend({
  recommendation: VerificationRecommendationSchema,
  verifiedBy: z.enum(["bedrock", "clip", "local"]),
  imageRoles: z.array(ImageRoleSchema),
  tookMs: z.number().int().nonnegative(),
});
export type VerificationAssessment = z.infer<typeof VerificationAssessmentSchema>;

// ── Geo ──────────────────────────────────────────────────────────────────
export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

// ── Listing & Product Health Card ──────────────────────────────────────────
export const ProductHealthCardSchema = z.object({
  verifiedCondition: GradeSchema,
  confidence: z.number().min(0).max(1),
  flaws: z.array(DetectedFlawSchema),
  history: z.array(z.string()),
});
export type ProductHealthCard = z.infer<typeof ProductHealthCardSchema>;

export const ListingDraftSchema = z.object({
  itemId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.number().nonnegative(),
  pricePct: z.number().min(0).max(2),
  photoUrl: z.string().nullable(),
  healthCard: ProductHealthCardSchema,
});
export type ListingDraft = z.infer<typeof ListingDraftSchema>;

// ── Matching ───────────────────────────────────────────────────────────────
export const BuyerMatchSchema = z.object({
  buyerId: z.string(),
  name: z.string(),
  distanceKm: z.number().nonnegative(),
  lat: z.number(),
  lng: z.number(),
});
export type BuyerMatch = z.infer<typeof BuyerMatchSchema>;
