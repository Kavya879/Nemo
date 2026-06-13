import type { Prisma, Return } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Return repository — data access for return events.
 */
export const returnRepository = {
  async create(data: Prisma.ReturnCreateInput): Promise<Return> {
    return prisma.return.create({ data });
  },

  async findById(id: string): Promise<Return | null> {
    return prisma.return.findUnique({ where: { id } });
  },

  async listForItem(itemId: string): Promise<Return[]> {
    return prisma.return.findMany({
      where: { itemId },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Historical returns for a category — feeds the prevention service. */
  async listForCategory(category: string, limit = 200): Promise<Return[]> {
    return prisma.return.findMany({
      where: { item: { category } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
