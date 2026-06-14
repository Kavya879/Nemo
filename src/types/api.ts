import { z } from "zod";
import { RoledImageInputSchema, GeoPointSchema, RoutingPathSchema } from "@/types";
import { RoutingContextSchema } from "@/services/routing/types";

/**
 * API request schemas. Routes validate incoming bodies/queries against these
 * (the only validation that happens at the HTTP boundary). Shared so the typed
 * frontend client can mirror them.
 */

// ── Admin: live config control ──
export const ConfigPatchSchema = z
  .object({
    matchRadiusKm: z.coerce.number().positive().optional(),
    feasibilityRatio: z.coerce.number().positive().optional(),
    warehouseProximityKm: z.coerce.number().positive().optional(),
    peerToPeerMinBuyers: z.coerce.number().int().nonnegative().optional(),
    repairabilityThreshold: z.coerce.number().min(0).max(1).optional(),
    returnWindowDays: z.coerce.number().int().positive().optional(),
    minNetRecoveryValue: z.coerce.number().optional(),
    demandPriceMultiplier: z.coerce.number().positive().optional(),
    transportCostPerKm: z.coerce.number().nonnegative().optional(),
    // Pre-grade verification thresholds (tunable live)
    verificationMatchThreshold: z.coerce.number().min(0).max(1).optional(),
    fraudRiskThreshold: z.coerce.number().min(0).max(1).optional(),
    minQualityConfidence: z.coerce.number().min(0).max(1).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, "Provide at least one config field to update.");

export const ListingStatusSchema = z.object({
  status: z.enum(["ACTIVE", "RESERVED", "SOLD", "INACTIVE"]),
});

export const CheckoutRequestSchema = z.object({
  userId: z.string().optional(),
  lines: z
    .array(
      z.object({
        listingId: z.string().min(1),
        itemId: z.string().min(1),
        category: z.string().min(1),
        originalPrice: z.number().nonnegative(),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

// ── Return workflow ──
export const InitiateReturnCaseSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1),
  userId: z.string().optional(),
  /** Pickup origin — drives warehouse-proximity routing + nearby matching. */
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
});

export const GradeImagesSchema = z.object({
  images: z.array(RoledImageInputSchema).min(1).max(5),
});

export const VerifyTransferSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional(),
});

export const ExpireWindowSchema = z.object({
  force: z.boolean().optional(),
});

export const DonationDecisionSchema = z.object({
  action: z.enum(["donate", "discard"]),
});

export const CreateItemRequestSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  brand: z.string().optional(),
  originalPrice: z.number().positive(),
  repairability: z.number().min(0).max(1).optional(),
});
export type CreateItemRequest = z.infer<typeof CreateItemRequestSchema>;

export const ReturnRequestSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1),
  photos: z.array(z.string()).default([]),
});
export type ReturnRequest = z.infer<typeof ReturnRequestSchema>;

export const GradeRequestSchema = z.object({
  images: z.array(RoledImageInputSchema).min(1).max(5),
  itemId: z.string().optional(),
});
export type GradeRequest = z.infer<typeof GradeRequestSchema>;

/** Standalone verification request (pre-grade product authentication). */
export const VerifyRequestSchema = z.object({
  images: z.array(RoledImageInputSchema).min(1).max(5),
  itemId: z.string().optional(),
});
export type VerifyRequestInput = z.infer<typeof VerifyRequestSchema>;

// ── AI-verdict challenge / dispute ──
const ChallengeEvidenceSchema = z.object({
  data: z.string().min(1),
  mimeType: z.string().optional(),
  role: z.string().optional(),
  note: z.string().optional(),
});

export const OpenChallengeSchema = z.object({
  reason: z.string().min(1),
  comment: z.string().min(1),
  userId: z.string().optional(),
  userName: z.string().optional(),
  evidence: z.array(ChallengeEvidenceSchema).max(5).default([]),
});
export type OpenChallengeInput = z.infer<typeof OpenChallengeSchema>;

export const AddChallengeEvidenceSchema = z.object({
  actor: z.string().min(1),
  bySeller: z.boolean().optional(),
  comment: z.string().optional(),
  evidence: z.array(ChallengeEvidenceSchema).max(5).default([]),
});
export type AddChallengeEvidenceInput = z.infer<typeof AddChallengeEvidenceSchema>;

export const AdminChallengeActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign"), reviewer: z.string().min(1) }),
  z.object({
    action: z.literal("requestInfo"),
    reviewer: z.string().min(1),
    message: z.string().min(1),
  }),
  z.object({
    action: z.literal("resolve"),
    reviewer: z.string().min(1),
    resolution: z.enum(["UPHOLD", "MODIFY", "OVERRIDE", "REJECT"]),
    revisedGrade: z.enum(["A", "B", "C", "D"]).optional(),
    reasoning: z.string().min(1),
  }),
]);
export type AdminChallengeActionInput = z.infer<typeof AdminChallengeActionSchema>;

// ── Return-prevention intelligence ──
export const RecordViewSchema = z.object({
  itemId: z.string().min(1),
  listingId: z.string().optional(),
  userId: z.string().optional(),
});
export type RecordViewInput = z.infer<typeof RecordViewSchema>;

export const CartIntelligenceSchema = z.object({
  userId: z.string().optional(),
  lines: z
    .array(
      z.object({
        listingId: z.string().min(1),
        itemId: z.string().min(1),
        category: z.string().min(1),
        originalPrice: z.number().nonnegative(),
        title: z.string().optional(),
      }),
    )
    .min(1),
});
export type CartIntelligenceInput = z.infer<typeof CartIntelligenceSchema>;

export const CreateReviewSchema = z.object({
  itemId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().optional(),
  body: z.string().min(1),
  userId: z.string().optional(),
  authorName: z.string().optional(),
});
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

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
