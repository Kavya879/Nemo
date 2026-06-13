import type { Item, Listing, ListingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ListingWithItem = Listing & { item: Item };

/**
 * Listing repository — data access for second-life marketplace listings.
 */
export const listingRepository = {
  async create(data: Prisma.ListingCreateInput): Promise<Listing> {
    return prisma.listing.create({ data });
  },

  async findById(id: string): Promise<ListingWithItem | null> {
    return prisma.listing.findUnique({ where: { id }, include: { item: true } });
  },

  async findByItemId(itemId: string): Promise<Listing | null> {
    return prisma.listing.findUnique({ where: { itemId } });
  },

  /** Active listings for the marketplace, newest first. */
  async listActive(limit = 50): Promise<ListingWithItem[]> {
    return prisma.listing.findMany({
      where: { status: "ACTIVE" },
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async updateStatus(id: string, status: ListingStatus): Promise<Listing> {
    return prisma.listing.update({ where: { id }, data: { status } });
  },
};
