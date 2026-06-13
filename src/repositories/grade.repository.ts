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
};
