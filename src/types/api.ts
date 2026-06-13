import { z } from "zod";
import { ImageInputSchema, GeoPointSchema, RoutingPathSchema } from "@/types";
import { RoutingContextSchema } from "@/services/routing/types";

/**
 * API request schemas. Routes validate incoming bodies/queries against these
 * (the only validation that happens at the HTTP boundary). Shared so the typed
 * frontend client can mirror them.
 */

export const ReturnRequestSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1),
  photos: z.array(z.string()).default([]),
});
export type ReturnRequest = z.infer<typeof ReturnRequestSchema>;

export const GradeRequestSchema = z.object({
  images: z.array(ImageInputSchema).min(1).max(5),
  itemId: z.string().optional(),
});
export type GradeRequest = z.infer<typeof GradeRequestSchema>;

export const RouteItemRequestSchema = z.object({
  context: RoutingContextSchema,
  itemId: z.string().optional(),
});
export type RouteItemRequest = z.infer<typeof RouteItemRequestSchema>;

export const CreateListingRequestSchema = z.object({
  itemId: z.string().min(1),
  grade: z.enum(["A", "B", "C", "D"]),
  confidence: z.number().min(0).max(1),
  flaws: z
    .array(
      z.object({
        type: z.string(),
        severity: z.enum(["minor", "moderate", "severe"]),
        location: z.string(),
      }),
    )
    .default([]),
  price: z.number().nonnegative(),
  pricePct: z.number().min(0).max(2),
  photoUrl: z.string().nullable().optional(),
  history: z.array(z.string()).optional(),
});
export type CreateListingRequest = z.infer<typeof CreateListingRequestSchema>;

export const PriceRequestSchema = z.object({
  grade: z.enum(["A", "B", "C", "D"]),
  originalPrice: z.number().nonnegative(),
  category: z.string().min(1),
  demandCount: z.coerce.number().int().nonnegative().default(0),
});
export type PriceRequest = z.infer<typeof PriceRequestSchema>;

export const MatchQuerySchema = z.object({
  category: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().optional(),
});
export type MatchQuery = z.infer<typeof MatchQuerySchema>;

export const PreventionQuerySchema = z.object({
  category: z.string().min(1),
  /** JSON-encoded profile object, optional. */
  profile: z.string().optional(),
});

export const RedeemRequestSchema = z.object({
  rewardId: z.string().min(1),
  userId: z.string().optional(),
});
export type RedeemRequest = z.infer<typeof RedeemRequestSchema>;

export const CreditsRequestSchema = z.object({
  action: RoutingPathSchema,
  category: z.string().min(1),
  originalPrice: z.number().nonnegative(),
  userId: z.string().optional(),
  itemId: z.string().optional(),
});
export type CreditsRequest = z.infer<typeof CreditsRequestSchema>;

export { GeoPointSchema };
