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

  /** Deletes the most recent return for an item (used to cancel a request). */
  async deleteLatestForItem(itemId: string): Promise<boolean> {
    const latest = await prisma.return.findFirst({
      where: { itemId },
      orderBy: { createdAt: "desc" },
    });
    if (!latest) return false;
    await prisma.return.delete({ where: { id: latest.id } });
    return true;
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
