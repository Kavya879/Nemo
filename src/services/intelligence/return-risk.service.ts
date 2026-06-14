import { itemRepository } from "@/repositories/item.repository";
import { NotFoundError } from "@/lib/errors";
import { combine, type EnsembleResult } from "./ensemble";
import { returnHistorySignal } from "./signals/return-history.signal";
import { reviewSentimentSignal } from "./signals/review-sentiment.signal";
import { sellerReliabilitySignal } from "./signals/seller-reliability.signal";
import { defectSignal } from "./signals/defect.signal";
import { userPropensitySignal } from "./signals/user-propensity.signal";
import type { Signal } from "./types";

/**
 * Return Risk service — produces the AI Return Risk Score for a product as an
 * ENSEMBLE of five independent real signals (history, reviews, seller, defects,
 * shopper propensity). Returns a low/medium/high level, a 0..100 score, the
 * top contributing reasons, and an overall confidence.
 */

// Weights sum to 1. Documented here; promotable to RoutingConfig later.
const WEIGHTS = {
  return_history: 0.34,
  review_sentiment: 0.22,
  seller_reliability: 0.18,
  defect: 0.16,
  user_propensity: 0.1,
} as const;

export interface ReturnRiskResult extends EnsembleResult {
  itemId: string;
  /** The raw signals keyed for downstream reuse (e.g. the passport). */
  signalMap: Record<string, Signal>;
}

export function createReturnRiskService() {
  return {
    async assess(itemId: string, userId?: string): Promise<ReturnRiskResult> {
      const item = await itemRepository.findById(itemId);
      if (!item) throw new NotFoundError(`Item ${itemId} not found.`);

      const [history, sentiment, seller, defect, propensity] = await Promise.all([
        returnHistorySignal({ itemId, category: item.category, brand: item.brand }),
        reviewSentimentSignal(itemId),
        sellerReliabilitySignal(item.brand),
        defectSignal({ itemId, brand: item.brand }),
        userPropensitySignal(userId),
      ]);

      const result = combine([
        { signal: history, weight: WEIGHTS.return_history },
        { signal: sentiment, weight: WEIGHTS.review_sentiment },
        { signal: seller, weight: WEIGHTS.seller_reliability },
        { signal: defect, weight: WEIGHTS.defect },
        { signal: propensity, weight: WEIGHTS.user_propensity },
      ]);

      return {
        ...result,
        itemId,
        signalMap: {
          return_history: history,
          review_sentiment: sentiment,
          seller_reliability: seller,
          defect,
          user_propensity: propensity,
        },
      };
    },
  };
}

export const returnRiskService = createReturnRiskService();
