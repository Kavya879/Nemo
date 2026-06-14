import { intelligenceRepository } from "@/repositories/intelligence.repository";
import { round, sampleConfidence, smoothedRate } from "../types";

export interface CohortInsight {
  /** Fraction of buyers who kept the item (did not return), 0..1. */
  keptRate: number;
  /** How many comparable purchases this is based on. */
  sampleSize: number;
  confidence: number;
  reason: string;
}

/**
 * "Customers like you" cohort insight — derived from REAL purchase/return
 * outcomes of shoppers who bought this exact item (falling back to the category
 * cohort when the item is new). Powers the Digital Twin's similar-customer
 * behaviour and the customers-like-you line on the product page.
 */
export async function cohortInsight(input: {
  itemId: string;
  category: string;
}): Promise<CohortInsight> {
  const [itemOrders, itemReturns, catOrders, catReturns] = await Promise.all([
    intelligenceRepository.countOrders({ itemId: input.itemId }),
    intelligenceRepository.countReturnCases({ itemId: input.itemId }),
    intelligenceRepository.countOrders({ category: input.category }),
    intelligenceRepository.countReturnCases({ category: input.category }),
  ]);

  // Prefer item-level cohort; fall back to category when the item is too new.
  const useItem = itemOrders >= 3;
  const orders = useItem ? itemOrders : catOrders;
  const returns = useItem ? itemReturns : catReturns;
  const keptRate = 1 - smoothedRate(returns, orders, 0.15, 5);
  const confidence = sampleConfidence(orders, 10);

  const pct = Math.round(keptRate * 100);
  const reason =
    orders === 0
      ? "Not enough purchases yet to compare with similar customers."
      : useItem
        ? `Customers who bought this kept it ~${pct}% of the time (${orders} buyers).`
        : `Shoppers buying ${input.category} keep it ~${pct}% of the time.`;

  return { keptRate: round(keptRate), sampleSize: orders, confidence: round(confidence), reason };
}
