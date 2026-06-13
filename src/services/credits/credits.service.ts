import type { GreenCredit, RoutingConfig } from "@prisma/client";
import { configRepository } from "@/repositories/config.repository";
import { creditRepository, type CreditTotals } from "@/repositories/credit.repository";
import type { RoutingPath } from "@/types";

/**
 * Credits service — calculates Green Credits + CO₂ and cost saved for a
 * second-life action, using factors from config. Persists the record and
 * returns the new running totals for the user.
 */

export interface CreditsInput {
  action: RoutingPath;
  category: string;
  originalPrice: number;
  userId?: string;
  itemId?: string;
}

export interface CreditsComputation {
  credits: number;
  co2SavedKg: number;
  costSaved: number;
}

export interface CreditsResult extends CreditsComputation {
  record: GreenCredit;
  totals: CreditTotals;
}

/** Pure computation core. */
export function computeCredits(
  input: Pick<CreditsInput, "action" | "category" | "originalPrice">,
  config: Pick<
    RoutingConfig,
    "creditsPerAction" | "co2FactorsByCategory" | "co2DefaultKg" | "costSavedFactor"
  >,
): CreditsComputation {
  const creditsMap = config.creditsPerAction as Record<string, number>;
  const co2Map = config.co2FactorsByCategory as Record<string, number>;

  const credits = creditsMap[input.action] ?? 10;
  const co2SavedKg = co2Map[input.category] ?? config.co2DefaultKg;
  // RECYCLE recovers materials but doesn't avoid a new purchase, so no cost saving.
  const costSaved =
    input.action === "RECYCLE"
      ? 0
      : Number((input.originalPrice * config.costSavedFactor).toFixed(2));

  return { credits, co2SavedKg, costSaved };
}

export function createCreditsService() {
  return {
    async award(input: CreditsInput): Promise<CreditsResult> {
      const config = await configRepository.getRules();
      const computed = computeCredits(input, config);
      const userId = input.userId ?? "demo-user";

      const record = await creditRepository.create({
        userId,
        action: input.action,
        credits: computed.credits,
        co2SavedKg: computed.co2SavedKg,
        costSaved: computed.costSaved,
        ...(input.itemId ? { item: { connect: { id: input.itemId } } } : {}),
      });

      const totals = await creditRepository.totalsForUser(userId);
      return { ...computed, record, totals };
    },

    async totals(userId = "demo-user"): Promise<CreditTotals> {
      return creditRepository.totalsForUser(userId);
    },
  };
}

export const creditsService = createCreditsService();
