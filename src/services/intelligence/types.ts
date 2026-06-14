/**
 * Shared vocabulary for the return-prevention intelligence engine.
 *
 * A Signal is one independent, REAL evidence source. For return-risk signals the
 * `value` is a risk contribution in 0..1 (higher = riskier); `confidence` (0..1)
 * reflects how much data backed it (small samples ⇒ low confidence). `meta`
 * carries raw metrics that downstream consumers (e.g. the Product Passport) read.
 */
export interface Signal {
  key: string;
  value: number; // 0..1
  confidence: number; // 0..1
  reason: string;
  meta?: Record<string, number | string | null>;
}

export type RiskLevel = "low" | "medium" | "high";

export const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
export const round = (n: number, d = 3): number => Number(n.toFixed(d));

/** Sample-size confidence: 0 with no data, → 1 as n grows past k. */
export const sampleConfidence = (n: number, k = 8): number => (n <= 0 ? 0 : n / (n + k));

/**
 * Laplace-smoothed rate so tiny samples don't produce extreme 0%/100% rates.
 * Pulls toward `prior` with pseudo-count `k`. Clamped to [0,1] — a rate can
 * never exceed 100% even if upstream counts are inconsistent (e.g. more return
 * cases than recorded orders in demo data).
 */
export const smoothedRate = (hits: number, total: number, prior = 0.15, k = 5): number => {
  if (total <= 0) return prior;
  return clamp01((hits + prior * k) / (total + k));
};

/** Map a condition grade to a 0..1 quality value. */
export const gradeQuality = (grade: "A" | "B" | "C" | "D"): number =>
  ({ A: 1, B: 0.78, C: 0.5, D: 0.22 })[grade];
