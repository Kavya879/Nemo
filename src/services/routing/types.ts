import { z } from "zod";
import { GradeSchema, RoutingPathSchema } from "@/types";

/**
 * Routing domain types.
 *
 * A rule is a small pure function: given the item context + the rules loaded
 * from config, it returns a candidate decision (path + score + reasoning) or
 * null when it doesn't apply. The orchestrator runs all rules and picks the
 * highest-scoring candidate.
 */

/** The inputs a routing decision is made from. Validated at the API boundary. */
export const RoutingContextSchema = z.object({
  grade: GradeSchema,
  category: z.string().min(1),
  /** Cost to re-list / prepare the item for resale. */
  relistingCost: z.number().nonnegative(),
  /** Expected resale value if listed. */
  resaleValue: z.number().nonnegative(),
  /** Count of nearby verified buyers who want this category. */
  nearbyDemandCount: z.number().int().nonnegative(),
  /** How repairable the item is, 0..1. */
  repairability: z.number().min(0).max(1),
});
export type RoutingContext = z.infer<typeof RoutingContextSchema>;

/** The config the rules read (parsed from the RoutingConfig row's JSON fields). */
export interface RoutingRules {
  peerToPeerMinBuyers: number;
  repairabilityThreshold: number;
  workingGrades: z.infer<typeof GradeSchema>[];
  gradeDefaultRoutes: Record<string, z.infer<typeof RoutingPathSchema>>;
}

/** A candidate decision produced by a single rule. */
export interface RuleCandidate {
  path: z.infer<typeof RoutingPathSchema>;
  /** 0..1 — higher wins. */
  score: number;
  /** Human-readable fragment explaining this candidate. */
  reasoning: string;
}

/** A routing rule: pure function, returns a candidate or null ("doesn't apply"). */
export type Rule = (
  ctx: RoutingContext,
  rules: RoutingRules,
) => RuleCandidate | null;

/** The orchestrator's final, persisted-shape output. */
export interface RoutingResult {
  path: z.infer<typeof RoutingPathSchema>;
  score: number;
  reasoning: string;
  inputs: RoutingContext;
  /** All candidates considered (for transparency/debugging/demo). */
  considered: RuleCandidate[];
}

/** Formats a number as INR for reasoning text. */
export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
