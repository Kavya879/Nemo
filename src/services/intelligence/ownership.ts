import { clamp01 } from "./types";

/**
 * Long-term ownership insights, derived from existing signals (no new model):
 *  - Warranty & Lifespan Prediction (specs lifespan × predicted durability),
 *  - Long-Term Ownership Cost (price amortized over lifespan + maintenance),
 *  - Purchase Regret Prediction (return risk + dissatisfaction + mismatch).
 */

export interface OwnershipInsights {
  predictedLifespanMonths: number;
  costPerYear: number;
  /** Null when there's no real risk/satisfaction evidence to base regret on. */
  regretProbability: number | null; // 0..100
  regretLevel: "low" | "medium" | "high" | null;
}

// Category lifespan baselines (months) when an item carries no explicit spec.
const LIFESPAN_BASELINE: Record<string, number> = {
  Electronics: 36,
  Footwear: 18,
  Apparel: 24,
  Home: 36,
  Books: 120,
  Toys: 48,
};

export function buildOwnershipInsights(input: {
  price: number;
  category: string;
  specs: Record<string, unknown>;
  /** Predicted durability 0..1 (passport durability/100). */
  durability: number;
  /** Customer satisfaction 0..1. */
  satisfaction: number;
  /** Return probability 0..1. */
  returnProbability: number;
  /** Expectation-mismatch 0..1. */
  mismatch: number;
  /** Whether there's real evidence to ground a regret estimate. */
  hasRiskEvidence: boolean;
}): OwnershipInsights {
  const baseline = LIFESPAN_BASELINE[input.category] ?? 30;
  const specLifespan =
    typeof input.specs.expectedLifespanMonths === "number"
      ? (input.specs.expectedLifespanMonths as number)
      : baseline;
  // Better-predicted durability extends life; poor durability shortens it.
  const predictedLifespanMonths = Math.max(
    3,
    Math.round(specLifespan * (0.7 + 0.6 * clamp01(input.durability))),
  );

  const maintenancePct =
    typeof input.specs.maintenanceCostPct === "number"
      ? (input.specs.maintenanceCostPct as number)
      : 0.02;
  const years = predictedLifespanMonths / 12;
  const costPerYear = Math.round(input.price / Math.max(years, 0.25) + input.price * maintenancePct);

  // Regret needs real risk/satisfaction evidence — otherwise we leave it empty
  // rather than inventing a number.
  const regret = input.hasRiskEvidence
    ? clamp01(0.45 * input.returnProbability + 0.35 * (1 - input.satisfaction) + 0.2 * input.mismatch)
    : null;
  const regretLevel =
    regret === null ? null : regret >= 0.6 ? "high" : regret >= 0.35 ? "medium" : "low";

  return {
    predictedLifespanMonths,
    costPerYear,
    regretProbability: regret === null ? null : Math.round(regret * 100),
    regretLevel,
  };
}
