import type { GreenCredit, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface CreditTotals {
  totalCredits: number;
  totalCo2SavedKg: number;
  totalCostSaved: number;
  count: number;
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

  /** Running totals for a user's impact dashboard. */
  async totalsForUser(userId: string): Promise<CreditTotals> {
    const agg = await prisma.greenCredit.aggregate({
      where: { userId },
      _sum: { credits: true, co2SavedKg: true, costSaved: true },
      _count: true,
    });
    return {
      totalCredits: agg._sum.credits ?? 0,
      totalCo2SavedKg: agg._sum.co2SavedKg ?? 0,
      totalCostSaved: agg._sum.costSaved ?? 0,
      count: agg._count,
    };
  },
};
