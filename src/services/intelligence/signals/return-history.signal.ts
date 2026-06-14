import { intelligenceRepository } from "@/repositories/intelligence.repository";
import { type Signal, clamp01, round, sampleConfidence, smoothedRate } from "../types";

/**
 * Return-history signal — the empirical return rate (returns ÷ orders) for this
 * item, its category, and its brand, blended and Laplace-smoothed. This is the
 * single strongest real predictor of future returns.
 */
export async function returnHistorySignal(input: {
  itemId: string;
  category: string;
  brand?: string | null;
}): Promise<Signal> {
  const [itemReturns, itemOrders, catReturns, catOrders, brandReturns, brandOrders] =
    await Promise.all([
      intelligenceRepository.countReturnCases({ itemId: input.itemId }),
      intelligenceRepository.countOrders({ itemId: input.itemId }),
      intelligenceRepository.countReturnCases({ category: input.category }),
      intelligenceRepository.countOrders({ category: input.category }),
      input.brand
        ? intelligenceRepository.countReturnCases({ brand: input.brand })
        : Promise.resolve(0),
      input.brand ? intelligenceRepository.countOrders({ brand: input.brand }) : Promise.resolve(0),
    ]);

  const itemRate = smoothedRate(itemReturns, itemOrders);
  const catRate = smoothedRate(catReturns, catOrders);
  const brandRate = input.brand ? smoothedRate(brandReturns, brandOrders) : catRate;

  // Item-specific evidence dominates when it exists; otherwise lean on category/brand.
  const value = clamp01(0.5 * itemRate + 0.3 * catRate + 0.2 * brandRate);
  const totalOrders = itemOrders + catOrders + brandOrders;
  const confidence = sampleConfidence(totalOrders, 12);

  const pct = Math.round(value * 100);
  const catPct = Math.round(catRate * 100);
  const reason =
    value > catRate + 0.05
      ? `Above-average return rate (~${pct}% vs ${catPct}% for ${input.category}).`
      : value < catRate - 0.05
        ? `Below-average return rate (~${pct}% vs ${catPct}% for ${input.category}).`
        : `Return rate in line with ${input.category} (~${pct}%).`;

  return {
    key: "return_history",
    value: round(value),
    confidence: round(confidence),
    reason,
    meta: {
      itemRate: round(itemRate),
      categoryRate: round(catRate),
      brandRate: round(brandRate),
      itemOrders,
      itemReturns,
    },
  };
}
