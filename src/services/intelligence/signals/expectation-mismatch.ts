import { type Signal, clamp01, round, sampleConfidence } from "../types";

interface ReviewLike {
  rating: number;
  title: string | null;
  body: string;
  sentiment: number | null;
}

/**
 * Expectation-mismatch signal — detects when buyers report the product differed
 * from what they expected (sizing, fit, colour, "not as described", looks
 * different in photos). Scans REAL review text for mismatch cues weighted by
 * negativity (low rating / negative cached sentiment). High mismatch is a strong
 * pre-purchase return predictor.
 */
const CUES = [
  "not as described",
  "looks different",
  "different from",
  "smaller than",
  "larger than",
  "runs small",
  "runs large",
  "too small",
  "too big",
  "doesn't fit",
  "did not fit",
  "wrong size",
  "wrong color",
  "wrong colour",
  "not what i expected",
  "misleading",
  "photos",
  "picture",
  "expected",
];

export function expectationMismatchSignal(reviews: ReviewLike[]): Signal {
  if (reviews.length === 0) {
    return {
      key: "expectation_mismatch",
      value: 0.3,
      confidence: 0,
      reason: "No reviews yet to detect expectation mismatches.",
      meta: { hits: 0, total: 0 },
    };
  }

  let weighted = 0;
  let hits = 0;
  for (const r of reviews) {
    const text = `${r.title ?? ""} ${r.body}`.toLowerCase();
    const matched = CUES.some((c) => text.includes(c));
    if (!matched) continue;
    hits += 1;
    // Negative reviews mentioning a mismatch weigh more than neutral ones.
    const negativity = r.sentiment != null ? clamp01(-r.sentiment) : r.rating <= 2 ? 0.9 : 0.4;
    weighted += 0.4 + 0.6 * negativity;
  }

  const value = clamp01(weighted / reviews.length);
  const confidence = sampleConfidence(reviews.length, 5);
  const pct = Math.round((hits / reviews.length) * 100);
  const reason =
    hits === 0
      ? "Reviews don't flag expectation mismatches."
      : `${pct}% of reviews mention sizing/expectation issues (e.g. fit, colour, "not as described").`;

  return {
    key: "expectation_mismatch",
    value: round(value),
    confidence: round(confidence),
    reason,
    meta: { hits, total: reviews.length },
  };
}
