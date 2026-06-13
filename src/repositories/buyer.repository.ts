import type { Buyer, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Buyer repository — data access for verified buyers + their wishlists.
 */
export const buyerRepository = {
  async create(data: Prisma.BuyerCreateInput): Promise<Buyer> {
    return prisma.buyer.create({ data });
  },

  async findById(id: string): Promise<Buyer | null> {
    return prisma.buyer.findUnique({ where: { id } });
  },

  async list(): Promise<Buyer[]> {
    return prisma.buyer.findMany();
  },

  /** Verified buyers whose wishlist contains the given category. */
  async findByWishlistCategory(category: string): Promise<Buyer[]> {
    return prisma.buyer.findMany({
      where: { verified: true, wishlist: { has: category } },
    });
  },
};
