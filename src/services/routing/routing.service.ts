import type { Prisma, RoutingConfig } from "@prisma/client";
import { configRepository } from "@/repositories/config.repository";
import { routingRepository } from "@/repositories/routing.repository";
import { itemRepository } from "@/repositories/item.repository";
import type { Grade, RoutingPath } from "@/types";
import { ALL_RULES } from "./rules";
import {
  type RoutingContext,
  type RoutingResult,
  type RoutingRules,
  type Rule,
  type RuleCandidate,
} from "./types";

/**
 * Routing service — the decision orchestrator.
 *
 * Loads thresholds/rules from the RoutingConfig table (nothing hardcoded), runs
 * the item context through every rule, selects the highest-scoring candidate,
 * and assembles a human-readable reasoning string. Optionally persists the
 * decision (with its inputs) so it's auditable.
 */

/** Parses the RoutingConfig row's JSON fields into the typed RoutingRules shape. */
export function parseRules(config: RoutingConfig): RoutingRules {
  return {
    peerToPeerMinBuyers: config.peerToPeerMinBuyers,
    repairabilityThreshold: config.repairabilityThreshold,
    workingGrades: config.workingGrades as Grade[],
    gradeDefaultRoutes: config.gradeDefaultRoutes as Record<string, RoutingPath>,
  };
}

/** Pure core: decide given an explicit rule set. Trivially unit-testable. */
export function decideWith(
  ctx: RoutingContext,
  rules: RoutingRules,
  ruleSet: Rule[] = ALL_RULES,
): RoutingResult {
  const considered: RuleCandidate[] = [];
  for (const rule of ruleSet) {
    const candidate = rule(ctx, rules);
    if (candidate) considered.push(candidate);
  }

  // Pick the highest score. Rule order (recycle last) breaks ties deterministically
  // toward the earlier rule, since we only replace on a strictly higher score.
  let winner = considered[0];
  for (const c of considered) {
    if (c.score > winner.score) winner = c;
  }

  return {
    path: winner.path,
    score: winner.score,
    reasoning: winner.reasoning,
    inputs: ctx,
    considered,
  };
}

export interface RouteRequest {
  context: RoutingContext;
  /** When present, the decision is persisted and the item is marked ROUTED. */
  itemId?: string;
}

export function createRoutingService() {
  return {
    /** Decide + (optionally) persist, loading rules live from config. */
    async route(req: RouteRequest): Promise<RoutingResult> {
      const config = await configRepository.getRules();
      const rules = parseRules(config);
      const result = decideWith(req.context, rules);

      if (req.itemId) {
        await routingRepository.create({
          path: result.path,
          reasoning: result.reasoning,
          score: result.score,
          inputs: result.inputs as unknown as Prisma.InputJsonValue,
          item: { connect: { id: req.itemId } },
        });
        await itemRepository.updateStatus(req.itemId, "ROUTED");
      }

      return result;
    },
  };
}

export const routingService = createRoutingService();
