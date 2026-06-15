import type { RoutingPath } from "@/types";

/**
 * Circular Commerce Decision Engine — tunables.
 *
 * These are the DEFAULTS. Every value can be overridden live via the
 * `RoutingConfig` table (`conditionScoreByGrade`, `routeScoreBands`,
 * `confidenceBandThresholds`) — nothing here is a hardcoded business rule the
 * ops team can't change. The defaults exist so the engine works the instant the
 * code ships, even before the config row is (re-)seeded.
 */

/** Ordered, high→low: the first band whose `minScore` ≤ score wins. */
export interface RouteScoreBand {
  minScore: number;
  route: RoutingPath;
}

export interface ConfidenceThresholds {
  high: number;
  medium: number;
}

/** Condition score (0–100) per grade — the midpoints of the route bands below. */
export const DEFAULT_CONDITION_SCORE_BY_GRADE: Record<string, number> = {
  A: 92,
  B: 80,
  C: 67,
  D: 30,
};

/**
 * The score → route mapping the user specified:
 *  ≥90 Resell · 75–89 Refurbish · 60–74 Peer-to-Peer · 40–59 Donate · <40 Recycle.
 */
export const DEFAULT_ROUTE_SCORE_BANDS: RouteScoreBand[] = [
  { minScore: 90, route: "RESELL_AS_IS" },
  { minScore: 75, route: "REFURBISH" },
  { minScore: 60, route: "PEER_TO_PEER" },
  { minScore: 40, route: "DONATE" },
  { minScore: 0, route: "RECYCLE" },
];

export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  high: 0.8,
  medium: 0.6,
};

/** Human labels for the five circular-commerce routes. */
export const ROUTE_LABELS: Record<RoutingPath, string> = {
  RESELL_AS_IS: "Resell As-Is",
  REFURBISH: "Refurbish & Resell",
  PEER_TO_PEER: "Peer-to-Peer Sale",
  DONATE: "Donate",
  RECYCLE: "Recycle",
};

/** Short emoji per route (UI). */
export const ROUTE_ICONS: Record<RoutingPath, string> = {
  RESELL_AS_IS: "🏷️",
  REFURBISH: "🛠️",
  PEER_TO_PEER: "🤝",
  DONATE: "🎁",
  RECYCLE: "♻️",
};

/** The canonical, score-band reason for each route (mirrors the spec's examples). */
export const ROUTE_BAND_REASONS: Record<RoutingPath, string> = {
  RESELL_AS_IS: "Excellent condition, high resale demand, negligible refurbishment required.",
  REFURBISH:
    "Minor cosmetic defects detected. Refurbishment cost is low compared to expected recovery value.",
  PEER_TO_PEER: "Usable condition but limited resale margin. Nearby buyer demand detected.",
  DONATE: "Low commercial recovery value but high social and sustainability impact.",
  RECYCLE: "Severe damage detected. Repair cost exceeds expected recovery value.",
};

/** Resolve the route whose band the score falls into (bands sorted high→low). */
export function routeForScore(score: number, bands: RouteScoreBand[]): RoutingPath {
  const sorted = [...bands].sort((a, b) => b.minScore - a.minScore);
  for (const band of sorted) {
    if (score >= band.minScore) return band.route;
  }
  return sorted[sorted.length - 1]?.route ?? "RECYCLE";
}
