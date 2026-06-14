import { intelligenceRepository } from "@/repositories/intelligence.repository";
import { type Signal, round, sampleConfidence, smoothedRate } from "../types";

/**
 * User-propensity signal — the shopper's OWN historical return rate (their
 * returns ÷ their orders). A frequent returner is more likely to return again.
 * Confidence is low for new users so it barely moves the score (the engine then
 * leans on product/seller signals instead).
 */
export async function userPropensitySignal(userId?: string): Promise<Signal> {
  if (!userId) {
    return {
      key: "user_propensity",
      value: 0.2,
      confidence: 0,
      reason: "No shopper history — using product-level signals only.",
      meta: { orders: 0, returns: 0 },
    };
  }

  const [returns, orders] = await Promise.all([
    intelligenceRepository.countReturnCases({ userId }),
    intelligenceRepository.countOrders({ userId }),
  ]);

  const value = smoothedRate(returns, orders, 0.2, 4);
  const confidence = sampleConfidence(orders, 5);
  const pct = Math.round(value * 100);

  const reason =
    orders === 0
      ? "No purchase history yet for your account."
      : value >= 0.4
        ? `You return ~${pct}% of orders — higher than typical.`
        : `Your return rate is typical (~${pct}%).`;

  return {
    key: "user_propensity",
    value: round(value),
    confidence: round(confidence),
    reason,
    meta: { orders, returns },
  };
}
