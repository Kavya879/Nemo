import type { ReturnRiskResult } from "./return-risk.service";
import type { ProductPassport } from "./passport.service";
import type { CohortInsight } from "./signals/cohort";
import { type Signal, clamp01, round } from "./types";

/**
 * Pre-Purchase Digital Twin — simulates ownership for THIS shopper by combining
 * the already-computed signals (no extra model calls): the ensemble return risk
 * (which is user-aware), the passport's satisfaction, the similar-customer
 * cohort, and expectation-mismatch. Produces the headline decision numbers.
 */

export type Recommendation =
  | "Proceed with purchase"
  | "Proceed with caution"
  | "Reconsider this purchase"
  | "Review details — limited data";

export interface DigitalTwin {
  purchaseSuccessScore: number; // 0..100
  satisfactionProbability: number; // 0..100
  returnProbability: number; // 0..100
  confidence: number; // 0..1
  riskFactors: string[];
  recommendation: Recommendation;
}

export function buildDigitalTwin(input: {
  risk: ReturnRiskResult;
  passport: ProductPassport;
  cohort: CohortInsight;
  mismatch: Signal;
}): DigitalTwin {
  const { risk, passport, cohort, mismatch } = input;

  const returnProb = clamp01(risk.score / 100);
  const satisfaction = clamp01(
    0.5 * (passport.customerSatisfaction.score / 100) +
      0.3 * (1 - returnProb) +
      0.2 * cohort.keptRate,
  );
  const success = clamp01(
    0.4 * (1 - returnProb) + 0.35 * satisfaction + 0.25 * cohort.keptRate,
  );

  // Overall confidence = how well-evidenced the inputs are.
  const confidence = round(
    clamp01(0.5 * risk.confidence + 0.3 * cohort.confidence + 0.2 * passport.customerSatisfaction.confidence),
  );

  // Risk factors: the strongest contributing reasons + mismatch if notable.
  const factors: string[] = [...risk.reasons.filter((r) => !/limited data/i.test(r)).slice(0, 2)];
  if (mismatch.confidence > 0 && mismatch.value >= 0.35) factors.push(mismatch.reason);
  if (cohort.confidence > 0 && cohort.keptRate < 0.7) factors.push(cohort.reason);
  if (factors.length === 0) factors.push("No significant risk factors detected for your profile.");

  let recommendation: Recommendation;
  if (confidence < 0.3) recommendation = "Review details — limited data";
  else if (success >= 0.7) recommendation = "Proceed with purchase";
  else if (success >= 0.5) recommendation = "Proceed with caution";
  else recommendation = "Reconsider this purchase";

  return {
    purchaseSuccessScore: Math.round(success * 100),
    satisfactionProbability: Math.round(satisfaction * 100),
    returnProbability: Math.round(returnProb * 100),
    confidence,
    riskFactors: factors.slice(0, 4),
    recommendation,
  };
}
