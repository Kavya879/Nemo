import type { GreenCredit, Prisma, RewardRedemption } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface CreditTotals {
  /** Lifetime credits earned. */
  totalCredits: number;
  totalCo2SavedKg: number;
  totalCostSaved: number;
  count: number;
  /** Credits spent on rewards. */
  totalRedeemed: number;
  /** Spendable balance = earned - redeemed. */
  availableBalance: number;
}

/**
 * GreenCredit repository — data access for earned credits + impact records.
 */
export const creditRepository = {
  async create(data: Prisma.GreenCreditCreateInput): Promise<GreenCredit> {
    return prisma.greenCredit.create({ data });
  },

  async listForUser(userId: string): Promise<GreenCredit[]> {
    return prisma.greenCredit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Running totals for a user's impact dashboard (earned, redeemed, balance). */
  async totalsForUser(userId: string): Promise<CreditTotals> {
    const [agg, redeemAgg] = await Promise.all([
      prisma.greenCredit.aggregate({
        where: { userId },
        _sum: { credits: true, co2SavedKg: true, costSaved: true },
        _count: true,
      }),
      prisma.rewardRedemption.aggregate({
        where: { userId },
        _sum: { cost: true },
      }),
    ]);
    const totalCredits = agg._sum.credits ?? 0;
    const totalRedeemed = redeemAgg._sum.cost ?? 0;
    return {
      totalCredits,
      totalCo2SavedKg: agg._sum.co2SavedKg ?? 0,
      totalCostSaved: agg._sum.costSaved ?? 0,
      count: agg._count,
      totalRedeemed,
      availableBalance: totalCredits - totalRedeemed,
    };
  },

  async createRedemption(
    data: Prisma.RewardRedemptionCreateInput,
  ): Promise<RewardRedemption> {
    return prisma.rewardRedemption.create({ data });
  },

  async listRedemptions(userId: string): Promise<RewardRedemption[]> {
    return prisma.rewardRedemption.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },
};
