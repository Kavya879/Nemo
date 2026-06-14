import { reviewRepository } from "@/repositories/review.repository";
import { type Signal, clamp01, round, sampleConfidence } from "../types";

/**
 * Review-sentiment signal — combines average star rating with the cached
 * open-source sentiment score over an item's reviews. Low ratings / negative
 * sentiment raise return risk (dissatisfaction → returns). Confidence scales
 * with the number of reviews.
 */
export async function reviewSentimentSignal(itemId: string): Promise<Signal> {
  const agg = await reviewRepository.aggregateForItem(itemId);

  if (agg.count === 0) {
    return {
      key: "review_sentiment",
      value: 0.4, // neutral-ish prior; low confidence makes it count little
      confidence: 0,
      reason: "No reviews yet — satisfaction is unknown.",
      meta: { count: 0, avgRating: null, avgSentiment: null },
    };
  }

  // Rating 1..5 → satisfaction 0..1; sentiment -1..1 → 0..1. Blend what we have.
  const ratingSat = agg.avgRating != null ? (agg.avgRating - 1) / 4 : null;
  const sentSat = agg.avgSentiment != null ? (agg.avgSentiment + 1) / 2 : null;
  const sat =
    ratingSat != null && sentSat != null
      ? 0.6 * ratingSat + 0.4 * sentSat
      : (ratingSat ?? sentSat ?? 0.5);

  const value = clamp01(1 - sat); // dissatisfaction = risk
  const confidence = sampleConfidence(agg.count, 5);

  const stars = agg.avgRating != null ? agg.avgRating.toFixed(1) : "—";
  const reason =
    sat >= 0.7
      ? `Reviews are largely positive (avg ${stars}★ over ${agg.count}).`
      : sat >= 0.45
        ? `Mixed reviews (avg ${stars}★ over ${agg.count}) — some dissatisfaction.`
        : `Reviews skew negative (avg ${stars}★ over ${agg.count}).`;

  return {
    key: "review_sentiment",
    value: round(value),
    confidence: round(confidence),
    reason,
    meta: {
      count: agg.count,
      avgRating: agg.avgRating != null ? round(agg.avgRating, 2) : null,
      avgSentiment: agg.avgSentiment != null ? round(agg.avgSentiment, 3) : null,
      satisfaction: round(sat),
    },
  };
}
