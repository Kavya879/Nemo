/**
 * Non-secret, non-business application constants.
 *
 * IMPORTANT: Business rules (thresholds, rates, radii, grade cutoffs, CO₂
 * factors, price bands) do NOT live here — they live in the `RoutingConfig`
 * table in the database so they can be changed live without a redeploy.
 *
 * Only stable, code-level constants belong in this file.
 */

/** Singleton key for the global config row in the RoutingConfig table. */
export const CONFIG_SINGLETON_KEY = "default";

/** Redis key prefixes for the nearby-buyer wishlist index. */
export const REDIS_KEYS = {
  /** Sorted/spatial index of buyers, e.g. wishlist:<category>. */
  wishlistByCategory: (category: string) => `wishlist:cat:${category}`,
  /** Hash of buyer metadata for fast hydration. */
  buyer: (buyerId: string) => `buyer:${buyerId}`,
} as const;

/** The fixed set of routing paths a decision can resolve to. */
export const ROUTING_PATHS = [
  "RESELL_AS_IS",
  "REFURBISH",
  "PEER_TO_PEER",
  "DONATE",
  "RECYCLE",
] as const;

/** The fixed set of condition grades. */
export const GRADES = ["A", "B", "C", "D"] as const;

/** Standard API response envelope version. */
export const API_VERSION = "1.0";

/** Earth radius in kilometers, for haversine distance. */
export const EARTH_RADIUS_KM = 6371;

/**
 * Local-grader grade cutoffs (config, not magic numbers): maps the offline
 * classifier's top-1 confidence onto a condition grade. Evaluated top-down.
 */
export const LOCAL_GRADER_GRADE_CUTOFFS: Array<{
  min: number;
  grade: "A" | "B" | "C" | "D";
}> = [
  { min: 0.85, grade: "A" },
  { min: 0.6, grade: "B" },
  { min: 0.35, grade: "C" },
  { min: 0, grade: "D" },
];
