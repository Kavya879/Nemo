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
  regretProbability: number; // 0..100
  regretLevel: "low" | "medium" | "high";
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

  const regret = clamp01(
    0.45 * input.returnProbability + 0.35 * (1 - input.satisfaction) + 0.2 * input.mismatch,
  );
  const regretLevel = regret >= 0.6 ? "high" : regret >= 0.35 ? "medium" : "low";

  return {
    predictedLifespanMonths,
    costPerYear,
    regretProbability: Math.round(regret * 100),
    regretLevel,
  };
}
