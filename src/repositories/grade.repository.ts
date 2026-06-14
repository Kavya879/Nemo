import type { GradeResult, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * GradeResult repository — data access for AI condition grades.
 */
export const gradeRepository = {
  async create(data: Prisma.GradeResultCreateInput): Promise<GradeResult> {
    return prisma.gradeResult.create({ data });
  },

  async findById(id: string): Promise<GradeResult | null> {
    return prisma.gradeResult.findUnique({ where: { id } });
  },

  /** Latest grade for an item, if any. */
  async findLatestForItem(itemId: string): Promise<GradeResult | null> {
    return prisma.gradeResult.findFirst({
      where: { itemId },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Aggregate grading-speed stats for the analytics dashboard. */
  async stats(): Promise<{ count: number; avgTookMs: number; underTwoSecPct: number }> {
    const agg = await prisma.gradeResult.aggregate({ _avg: { tookMs: true }, _count: true });
    const count = agg._count;
    if (count === 0) return { count: 0, avgTookMs: 0, underTwoSecPct: 0 };
    const under = await prisma.gradeResult.count({ where: { tookMs: { lt: 2000 } } });
    return {
      count,
      avgTookMs: Math.round(agg._avg.tookMs ?? 0),
      underTwoSecPct: Number((under / count).toFixed(3)),
    };
  },
};
