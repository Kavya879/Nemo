import { reviewRepository } from "@/repositories/review.repository";
import { itemRepository } from "@/repositories/item.repository";
import { orderRepository } from "@/repositories/order.repository";
import { NotFoundError } from "@/lib/errors";
import { returnRiskService } from "./return-risk.service";
import { passportService } from "./passport.service";
import { cohortInsight, type CohortInsight } from "./signals/cohort";
import { expectationMismatchSignal } from "./signals/expectation-mismatch";
import { buildDigitalTwin, type DigitalTwin } from "./digital-twin";
import { buildOwnershipInsights, type OwnershipInsights } from "./ownership";
import { checkCompatibility, type CompatibilityResult } from "./compatibility";
import type { ProductPassport } from "./passport.service";
import type { ReturnRiskResult } from "./return-risk.service";

/**
 * Intelligence service — composes the full pre-purchase intelligence payload for
 * a product page in one call: the ensemble Return Risk Score, the AI Product
 * Passport, a Digital Twin (per-shopper ownership simulation), the
 * customers-like-you cohort, and a concise review summary. All reuse the shared
 * signal engine; reviews are fetched once and used for both summary + mismatch.
 */

interface ReviewLite {
  id: string;
  authorName: string | null;
  rating: number;
  title: string | null;
  body: string;
  sentiment: number | null;
  createdAt: string;
}

export interface ReviewSummary {
  count: number;
  avgRating: number | null;
  avgSentiment: number | null;
  positive: ReviewLite | null;
  critical: ReviewLite | null;
  expectationMismatch: { value: number; confidence: number; reason: string };
}

export interface ProductIntelligence {
  itemId: string;
  returnRisk: ReturnRiskResult;
  passport: ProductPassport;
  twin: DigitalTwin;
  cohort: CohortInsight;
  ownership: OwnershipInsights;
  compatibility: CompatibilityResult;
  reviews: ReviewSummary;
}

export function createIntelligenceService() {
  return {
    async productIntelligence(itemId: string, userId?: string): Promise<ProductIntelligence> {
      const item = await itemRepository.findById(itemId);
      if (!item) throw new NotFoundError(`Item ${itemId} not found.`);

      const [returnRisk, passport, reviews, aggregate, cohort, owned] = await Promise.all([
        returnRiskService.assess(itemId, userId),
        passportService.build(itemId),
        reviewRepository.listForItem(itemId, 100),
        reviewRepository.aggregateForItem(itemId),
        cohortInsight({ itemId, category: item.category }),
        userId ? orderRepository.listForUser(userId) : Promise.resolve([]),
      ]);

      const mismatch = expectationMismatchSignal(reviews);

      const lite = (r: (typeof reviews)[number]): ReviewLite => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        title: r.title,
        body: r.body,
        sentiment: r.sentiment,
        createdAt: r.createdAt.toISOString(),
      });
      const byScore = [...reviews].sort(
        (a, b) => (b.sentiment ?? (b.rating - 3) / 2) - (a.sentiment ?? (a.rating - 3) / 2),
      );

      const reviewSummary: ReviewSummary = {
        count: aggregate.count,
        avgRating: aggregate.avgRating,
        avgSentiment: aggregate.avgSentiment,
        positive: byScore.length ? lite(byScore[0]) : null,
        critical: byScore.length > 1 ? lite(byScore[byScore.length - 1]) : null,
        expectationMismatch: {
          value: mismatch.value,
          confidence: mismatch.confidence,
          reason: mismatch.reason,
        },
      };

      const twin = buildDigitalTwin({ risk: returnRisk, passport, cohort, mismatch });

      const specs = (item.specs as Record<string, unknown>) ?? {};
      const ownership = buildOwnershipInsights({
        price: passport.resaleValue.amount || item.originalPrice,
        category: item.category,
        specs,
        durability: passport.durabilityPrediction.score / 100,
        satisfaction: passport.customerSatisfaction.score / 100,
        returnProbability: twin.returnProbability / 100,
        mismatch: mismatch.value,
      });

      const compatibility = checkCompatibility({
        category: item.category,
        specs,
        ownedItems: owned.map((o) => ({ name: o.item.name, category: o.item.category })),
      });

      return {
        itemId,
        returnRisk,
        passport,
        twin,
        cohort,
        ownership,
        compatibility,
        reviews: reviewSummary,
      };
    },

    /** Compact risk for listing cards — reuses the same ensemble (one source of truth). */
    async cardRisk(itemId: string): Promise<{ level: "low" | "medium" | "high"; score: number }> {
      const r = await returnRiskService.assess(itemId);
      return { level: r.level, score: r.score };
    },
  };
}

export const intelligenceService = createIntelligenceService();
