import type { RoutingConfig } from "@prisma/client";
import { configRepository } from "@/repositories/config.repository";
import { returnCaseRepository } from "@/repositories/return-case.repository";
import { feasibilityService } from "@/services/feasibility/feasibility.service";
import { matchingService } from "@/services/matching/matching.service";
import { computeCredits } from "@/services/credits/credits.service";
import { decideWith, parseRules } from "@/services/routing/routing.service";
import { CUSTOMER_LOCATION } from "@/config/constants";
import { NotFoundError, ConflictError } from "@/lib/errors";
import {
  DEFAULT_CONDITION_SCORE_BY_GRADE,
  DEFAULT_CONFIDENCE_THRESHOLDS,
  DEFAULT_ROUTE_SCORE_BANDS,
  ROUTE_BAND_REASONS,
  ROUTE_ICONS,
  ROUTE_LABELS,
  routeForScore,
  type ConfidenceThresholds,
  type RouteScoreBand,
} from "@/config/decision-engine";
import type { GeoPoint, Grade, RoutingPath } from "@/types";

/**
 * Circular Commerce Decision Engine.
 *
 * The single brain that turns an AI-graded return into the highest-value, most
 * sustainable second-life outcome. It does NOT reinvent the sub-engines — it
 * ASKS each of them (feasibility, pricing, nearby-buyer matching, the routing
 * rule-set, the green-credits calculator) for its read on the item, then fuses
 * those signals into one explainable recommendation:
 *
 *   route + confidence(High/Medium/Low) + reasoning + a full factor breakdown
 *   + economics (selling price, refurb cost, recovery) + sustainability (CO₂,
 *   ReLoop credits) + a comparison of all five routes (so an override is informed)
 *   + whether to escalate to a human.
 *
 * Headline route comes from the configurable condition-score bands (the spec's
 * ≥90 → Resell … <40 → Recycle); the other factors then *nudge* within clear,
 * config-driven guardrails and set the confidence. Every threshold is read from
 * RoutingConfig (with safe defaults), so nothing is hardcoded.
 */

export type ConfidenceBand = "High" | "Medium" | "Low";

export interface DecisionFactor {
  key: string;
  label: string;
  value: string;
  detail: string;
  /** How this factor pulled on the decision. */
  influence: "supports" | "caution" | "neutral";
}

export interface RouteOption {
  route: RoutingPath;
  label: string;
  icon: string;
  recoveryValue: number;
  recoveryPct: number;
  co2SavedKg: number;
  reLoopCredits: number;
  recommended: boolean;
}

export interface CircularDecision {
  caseId: string;
  itemName: string;
  recommendedRoute: RoutingPath;
  recommendedLabel: string;
  recommendedIcon: string;
  conditionScore: number; // 0–100
  scoreBandRoute: RoutingPath; // baseline straight from the score
  nudged: boolean; // did factors move it off the score-band baseline?
  confidence: number; // 0..1
  confidenceBand: ConfidenceBand;
  reasoning: string;
  factors: DecisionFactor[];
  economics: {
    estimatedSellingPrice: number;
    refurbishmentCost: number;
    recoveryValue: number;
    recoveryPct: number; // 0..1
  };
  sustainability: {
    co2SavedKg: number;
    reLoopCredits: number;
  };
  options: RouteOption[];
  escalationSuggested: boolean;
  escalationReason: string | null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

/** Read the engine's tunables from config, falling back to code defaults. */
function tunables(config: RoutingConfig): {
  gradeScores: Record<string, number>;
  bands: RouteScoreBand[];
  conf: ConfidenceThresholds;
} {
  // Accessed loosely so the code compiles whether or not the Prisma client has
  // been regenerated with the new columns yet.
  const c = config as unknown as Record<string, unknown>;
  return {
    gradeScores:
      (c.conditionScoreByGrade as Record<string, number> | null | undefined) ??
      DEFAULT_CONDITION_SCORE_BY_GRADE,
    bands:
      (c.routeScoreBands as RouteScoreBand[] | null | undefined) ?? DEFAULT_ROUTE_SCORE_BANDS,
    conf:
      (c.confidenceBandThresholds as ConfidenceThresholds | null | undefined) ??
      DEFAULT_CONFIDENCE_THRESHOLDS,
  };
}

/** Commercial recovery value for a given route (₹). */
function recoveryValueFor(
  route: RoutingPath,
  v: { resaleValue: number; refurbishmentCost: number; originalPrice: number },
): number {
  switch (route) {
    case "RESELL_AS_IS":
    case "PEER_TO_PEER":
      return Math.round(v.resaleValue);
    case "REFURBISH":
      return Math.max(0, Math.round(v.resaleValue - v.refurbishmentCost));
    case "DONATE":
      return 0; // no commercial recovery — value is social/sustainability
    case "RECYCLE":
      return Math.round(v.originalPrice * 0.05); // small material recovery
    default:
      return 0;
  }
}

export function createCircularDecisionService() {
  return {
    /** Compute the live recommendation for a graded return case. */
    async recommendForCase(caseId: string): Promise<CircularDecision> {
      const c = await returnCaseRepository.findById(caseId);
      if (!c) throw new NotFoundError(`Return case ${caseId} not found.`);
      if (!c.grade) {
        throw new ConflictError("This case hasn't been graded yet — no decision to make.");
      }

      const config = await configRepository.getRules();
      const { gradeScores, bands, conf } = tunables(config);
      const rules = parseRules(config);

      const grade = c.grade as Grade;
      const gradeConfidence = c.gradeConfidence ?? 0.7;
      const originalPrice = c.item.originalPrice;
      const category = c.item.category;
      const repairability = c.item.repairability;

      // ── Condition score (0–100) from grade, nudged by grading confidence ──
      const base = gradeScores[grade] ?? 50;
      const conditionScore = Math.round(clamp(base + (gradeConfidence - 0.7) * 20, 0, 100));

      // ── Ask the sub-engines ──────────────────────────────────────────────
      const origin: GeoPoint =
        c.pickupLat != null && c.pickupLng != null
          ? { lat: c.pickupLat, lng: c.pickupLng }
          : CUSTOMER_LOCATION;

      const nearby = await matchingService.findNearby({ category, origin });
      const demandCount = nearby.length;
      const nearestBuyerKm = nearby[0]?.distanceKm ?? null;

      const feasibility = await feasibilityService.analyze({
        grade,
        originalPrice,
        category,
        customerLocation: origin,
        demandCount,
      });
      const estimatedSellingPrice = Math.round(feasibility.expectedResaleValue);
      const refurbishmentCost = Math.round(feasibility.repackagingCost + feasibility.inspectionCost);

      // The existing rule-set's independent opinion (a strong signal).
      const signal = decideWith(
        {
          grade,
          category,
          relistingCost: feasibility.totalProcessingCost,
          resaleValue: feasibility.expectedResaleValue,
          nearbyDemandCount: demandCount,
          repairability,
        },
        rules,
      );

      // ── Fuse: score band is the headline; factors nudge within guardrails ──
      const scoreBandRoute = routeForScore(conditionScore, bands);
      let route = scoreBandRoute;
      const nudges: string[] = [];

      const isResaleFamily = (r: RoutingPath) =>
        r === "RESELL_AS_IS" || r === "REFURBISH" || r === "PEER_TO_PEER";
      const working = rules.workingGrades.includes(grade);

      // 1) Thin margin + real nearby demand → peer-to-peer captures the most value.
      if (
        (route === "RESELL_AS_IS" || route === "REFURBISH") &&
        demandCount >= rules.peerToPeerMinBuyers &&
        feasibility.netRecoveryValue <= 0
      ) {
        route = "PEER_TO_PEER";
        nudges.push(
          `resale margin is thin (net ₹${Math.round(feasibility.netRecoveryValue)}) but ${demandCount} nearby buyer(s) want it`,
        );
      }
      // 2) Still usable but slated to recycle → donate instead of destroy.
      if (route === "RECYCLE" && working && repairability >= rules.repairabilityThreshold) {
        route = "DONATE";
        nudges.push("the item still works and is repairable — donating beats recycling");
      }
      // 3) Headed to donate but unrepairable with negative recovery → recycle.
      if (route === "DONATE" && repairability < rules.repairabilityThreshold && feasibility.netRecoveryValue < 0) {
        route = "RECYCLE";
        nudges.push(`low repairability (${Math.round(repairability * 100)}%) and negative recovery`);
      }

      const nudged = route !== scoreBandRoute;
      const agrees = signal.path === route;

      // ── Confidence: grading conf + rule-engine agreement + band clarity ──
      const sorted = [...bands].sort((a, b) => b.minScore - a.minScore);
      const bandIdx = sorted.findIndex((b) => conditionScore >= b.minScore);
      const lower = sorted[bandIdx]?.minScore ?? 0;
      const upper = sorted[bandIdx - 1]?.minScore ?? 100;
      const span = Math.max(upper - lower, 1);
      const distToEdge = Math.min(conditionScore - lower, upper - conditionScore);
      const bandClarity = clamp(distToEdge / (span / 2), 0, 1);

      const confidence = clamp(
        0.4 * gradeConfidence + 0.35 * (agrees ? 1 : 0.45) + 0.25 * bandClarity,
        0,
        1,
      );
      const confidenceBand: ConfidenceBand =
        confidence >= conf.high ? "High" : confidence >= conf.medium ? "Medium" : "Low";

      // ── Recovery + sustainability for the chosen route ──
      const valueInputs = { resaleValue: feasibility.expectedResaleValue, refurbishmentCost, originalPrice };
      const recoveryValue = recoveryValueFor(route, valueInputs);
      const recoveryPct = originalPrice > 0 ? Number((recoveryValue / originalPrice).toFixed(3)) : 0;
      const chosenCredits = computeCredits({ action: route, category, originalPrice }, config);

      // ── All five routes, compared (informs a manual override) ──
      const options: RouteOption[] = (
        ["RESELL_AS_IS", "REFURBISH", "PEER_TO_PEER", "DONATE", "RECYCLE"] as RoutingPath[]
      ).map((r) => {
        const rv = recoveryValueFor(r, valueInputs);
        const credits = computeCredits({ action: r, category, originalPrice }, config);
        return {
          route: r,
          label: ROUTE_LABELS[r],
          icon: ROUTE_ICONS[r],
          recoveryValue: rv,
          recoveryPct: originalPrice > 0 ? Number((rv / originalPrice).toFixed(3)) : 0,
          co2SavedKg: credits.co2SavedKg,
          reLoopCredits: credits.credits,
          recommended: r === route,
        };
      });

      // ── Reasoning: the canonical band reason + the data that backs it ──
      let reasoning = ROUTE_BAND_REASONS[route];
      if (nudges.length) {
        reasoning += ` Adjusted because ${nudges.join("; ")}.`;
      } else if (agrees) {
        reasoning += ` The rules engine independently agrees.`;
      }

      // ── Transparency: "Why did Nemo choose this route?" ──
      const factors: DecisionFactor[] = [
        {
          key: "conditionScore",
          label: "AI condition score",
          value: `${conditionScore}/100 (Grade ${grade})`,
          detail: `Derived from the AI grade at ${Math.round(gradeConfidence * 100)}% assessment confidence.`,
          influence: "supports",
        },
        {
          key: "originalValue",
          label: "Original value",
          value: `₹${originalPrice.toLocaleString("en-IN")}`,
          detail: "The product's original retail price — the ceiling for recovery.",
          influence: "neutral",
        },
        {
          key: "sellingPrice",
          label: "Estimated selling price",
          value: `₹${estimatedSellingPrice.toLocaleString("en-IN")}`,
          detail: feasibility.reasoning,
          influence: isResaleFamily(route) ? "supports" : "neutral",
        },
        {
          key: "refurbCost",
          label: "Refurbishment cost",
          value: `₹${refurbishmentCost.toLocaleString("en-IN")}`,
          detail: "Inspection + repackaging effort, scaled by grade.",
          influence: route === "REFURBISH" ? "caution" : "neutral",
        },
        {
          key: "netRecovery",
          label: "Net recovery (if shipped back)",
          value: `₹${Math.round(feasibility.netRecoveryValue).toLocaleString("en-IN")}`,
          detail: `Resale value minus reverse-logistics cost (ratio ${feasibility.recoveryRatio.toFixed(2)}).`,
          influence: feasibility.netRecoveryValue <= 0 ? "caution" : "supports",
        },
        {
          key: "demand",
          label: "Nearby buyer demand",
          value: `${demandCount} buyer(s) within ${config.matchRadiusKm}km`,
          detail:
            nearestBuyerKm != null
              ? `Nearest interested buyer ~${nearestBuyerKm}km away.`
              : "No nearby demand detected yet.",
          influence: demandCount >= rules.peerToPeerMinBuyers ? "supports" : "neutral",
        },
        {
          key: "distance",
          label: "Distance to fulfillment center",
          value: `${Math.round(feasibility.distanceKm)}km`,
          detail: feasibility.proximityFeasible
            ? "Close to an FC — cheap to return normally."
            : "Far from an FC — local second life avoids reverse-logistics cost & CO₂.",
          influence: feasibility.proximityFeasible ? "neutral" : "supports",
        },
        {
          key: "repairability",
          label: "Repairability",
          value: `${Math.round(repairability * 100)}%`,
          detail: `Threshold for refurbishment is ${Math.round(rules.repairabilityThreshold * 100)}%.`,
          influence:
            route === "REFURBISH"
              ? "supports"
              : route === "RECYCLE"
                ? "caution"
                : "neutral",
        },
        {
          key: "sustainability",
          label: "Environmental impact",
          value: `${chosenCredits.co2SavedKg}kg CO₂ saved`,
          detail: `Choosing ${ROUTE_LABELS[route]} earns ${chosenCredits.credits} ReLoop credits.`,
          influence: "supports",
        },
        {
          key: "ruleEngine",
          label: "Rule-engine cross-check",
          value: agrees ? `Agrees (${ROUTE_LABELS[signal.path]})` : `Differs (${ROUTE_LABELS[signal.path]})`,
          detail: signal.reasoning,
          influence: agrees ? "supports" : "caution",
        },
      ];

      // ── Escalation: offer a human review when the call isn't clear-cut ──
      const lowQuality = gradeConfidence < config.minQualityConfidence;
      // Only truly borderline scores (within 3 of a LOWER boundary) warrant
      // escalation — being near the top of the range (close to 100) is fine.
      const upperEdge = sorted[bandIdx - 1]?.minScore ?? Infinity;
      const distToLowerBoundary = conditionScore - lower;
      const distToUpperBoundary = upperEdge - conditionScore;
      const borderline = distToLowerBoundary <= 3 || (distToUpperBoundary <= 3 && upperEdge < 100);
      const escalationSuggested = confidenceBand === "Low" || lowQuality || borderline;
      const escalationReason = escalationSuggested
        ? lowQuality
          ? `Grading confidence (${Math.round(gradeConfidence * 100)}%) is below the ${Math.round(
              config.minQualityConfidence * 100,
            )}% bar.`
          : borderline
            ? `Condition score ${conditionScore} sits right on a route boundary (${distToLowerBoundary <= 3 ? "near the lower edge" : "near the upper edge"}).`
            : `Overall confidence is ${confidenceBand.toLowerCase()} — a human may want to confirm.`
        : null;

      return {
        caseId: c.id,
        itemName: c.item.name,
        recommendedRoute: route,
        recommendedLabel: ROUTE_LABELS[route],
        recommendedIcon: ROUTE_ICONS[route],
        conditionScore,
        scoreBandRoute,
        nudged,
        confidence: Number(confidence.toFixed(3)),
        confidenceBand,
        reasoning,
        factors,
        economics: { estimatedSellingPrice, refurbishmentCost, recoveryValue, recoveryPct },
        sustainability: { co2SavedKg: chosenCredits.co2SavedKg, reLoopCredits: chosenCredits.credits },
        options,
        escalationSuggested,
        escalationReason,
      };
    },
  };
}

export const circularDecisionService = createCircularDecisionService();
