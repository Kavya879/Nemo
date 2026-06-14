import { intelligenceRepository } from "@/repositories/intelligence.repository";
import { type Signal, clamp01, gradeQuality, round, sampleConfidence, smoothedRate } from "../types";

/**
 * Seller-reliability signal — brand-as-seller. Reliability blends the brand's
 * real return rate, the average inspected condition grade of its items, and how
 * often inspections found flaws. Low reliability raises return risk.
 */
export async function sellerReliabilitySignal(brand?: string | null): Promise<Signal> {
  if (!brand) {
    return {
      key: "seller_reliability",
      value: 0.4,
      confidence: 0,
      reason: "Seller is unbranded — reliability unknown.",
      meta: { reliability: null },
    };
  }

  const [returns, orders, grades] = await Promise.all([
    intelligenceRepository.countReturnCases({ brand }),
    intelligenceRepository.countOrders({ brand }),
    intelligenceRepository.gradeOutcomes({ brand }),
  ]);

  const returnRate = smoothedRate(returns, orders);
  const avgGradeQuality =
    grades.count > 0
      ? grades.grades.reduce((s, g) => s + gradeQuality(g), 0) / grades.count
      : 0.7; // neutral prior
  const flawFreq = grades.count > 0 ? grades.withFlaws / grades.count : 0.3;

  const reliability = clamp01(
    0.45 * (1 - returnRate) + 0.35 * avgGradeQuality + 0.2 * (1 - flawFreq),
  );
  const value = clamp01(1 - reliability);
  const confidence = sampleConfidence(orders + grades.count, 10);

  const reason =
    reliability >= 0.75
      ? `${brand} is a reliable seller (low returns, good condition history).`
      : reliability >= 0.5
        ? `${brand} has average reliability.`
        : `${brand} shows weaker reliability (higher returns / more flaws).`;

  return {
    key: "seller_reliability",
    value: round(value),
    confidence: round(confidence),
    reason,
    meta: {
      reliability: round(reliability),
      brandReturnRate: round(returnRate),
      avgGradeQuality: round(avgGradeQuality),
      flawFreq: round(flawFreq),
    },
  };
}
