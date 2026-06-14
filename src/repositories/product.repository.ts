import type { Prisma, Product } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Product repository — data access for brand-new catalog inventory (the
 * standard Amazon-style ecosystem, distinct from the resold Item→Listing flow).
 * Stock is the single source of truth for availability.
 */
export const productRepository = {
  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return prisma.product.create({ data });
  },

  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } });
  },

  /**
   * Active products for the catalog. In-stock first (availability priority),
   * out-of-stock pushed to the bottom; newest first within each group.
   */
  async listActive(limit = 50): Promise<Product[]> {
    return prisma.product.findMany({
      where: { active: true },
      orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  },

  /**
   * Atomically reserve `qty` units. Returns the updated product, or null if
   * there isn't enough stock (the conditional update matches zero rows). This is
   * the oversell guard — it cannot decrement below zero.
   */
  async decrementStock(id: string, qty: number): Promise<Product | null> {
    const res = await prisma.product.updateMany({
      where: { id, stock: { gte: qty } },
      data: { stock: { decrement: qty }, soldCount: { increment: qty } },
    });
    if (res.count === 0) return null;
    return prisma.product.findUnique({ where: { id } });
  },

  /** Restore `qty` units (used when a brand-new order is cancelled). */
  async incrementStock(id: string, qty: number): Promise<void> {
    await prisma.product
      .update({
        where: { id },
        data: { stock: { increment: qty }, soldCount: { decrement: qty } },
      })
      .catch(() => undefined);
  },
};
