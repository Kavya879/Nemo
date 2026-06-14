import type { GreenCredit, RewardRedemption, RoutingConfig } from "@prisma/client";
import { configRepository } from "@/repositories/config.repository";
import { creditRepository, type CreditTotals } from "@/repositories/credit.repository";
import { REWARDS, type Reward } from "@/config/constants";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { RoutingPath } from "@/types";

/** Generates a human-friendly, unique-enough coupon code, e.g. RL100-7F3K. */
function generateCouponCode(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${suffix}`;
}

/** A redemption enriched with its catalog details (for the coupons page). */
export interface RedemptionWithReward {
  id: string;
  code: string;
  rewardId: string;
  rewardLabel: string;
  cost: number;
  createdAt: Date;
  description: string;
  redeemUrl: string;
  redeemAt: string;
  kind: Reward["kind"];
}

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

    /** Redeem a reward, deducting its credit cost (fails if balance is short). */
    async redeem(
      rewardId: string,
      userId = "demo-user",
    ): Promise<{ redemption: RewardRedemption; totals: CreditTotals }> {
      const reward = REWARDS.find((r) => r.id === rewardId);
      if (!reward) throw new NotFoundError(`Unknown reward "${rewardId}".`);

      const totals = await creditRepository.totalsForUser(userId);
      if (totals.availableBalance < reward.cost) {
        throw new ConflictError(
          `Not enough credits: need ${reward.cost}, have ${totals.availableBalance}.`,
        );
      }

      const redemption = await creditRepository.createRedemption({
        userId,
        rewardId: reward.id,
        rewardLabel: reward.label,
        cost: reward.cost,
        code: generateCouponCode(reward.codePrefix),
      });
      const updated = await creditRepository.totalsForUser(userId);
      return { redemption, totals: updated };
    },

    /** Redeemed coupons for a user, enriched with catalog details + redeem link. */
    async redemptions(userId = "demo-user"): Promise<RedemptionWithReward[]> {
      const rows = await creditRepository.listRedemptions(userId);
      return rows.map((r) => {
        const reward = REWARDS.find((x) => x.id === r.rewardId);
        return {
          id: r.id,
          code: r.code,
          rewardId: r.rewardId,
          rewardLabel: r.rewardLabel,
          cost: r.cost,
          createdAt: r.createdAt,
          description: reward?.description ?? r.rewardLabel,
          redeemUrl: reward?.redeemUrl ?? "/marketplace",
          redeemAt: reward?.redeemAt ?? "Amazon Nemo Marketplace",
          kind: reward?.kind ?? "voucher",
        };
      });
    },
  };
}

export const creditsService = createCreditsService();
