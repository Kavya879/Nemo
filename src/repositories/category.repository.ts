import { prisma } from "@/lib/db";

export interface CategoryCount {
  category: string;
  /** Total catalog items in this category. */
  total: number;
  /** Items currently live as an active second-life listing. */
  activeListings: number;
}

/**
 * Category repository — derives the category taxonomy from the LIVE catalog
 * (distinct Item.category + active-listing counts) rather than any hardcoded
 * list. The storefront, search, and sell form all read categories from here.
 */
export const categoryRepository = {
  async distinctWithCounts(): Promise<CategoryCount[]> {
    const items = await prisma.item.findMany({
      select: { category: true, listing: { select: { status: true } } },
    });

    const map = new Map<string, CategoryCount>();
    for (const it of items) {
      const key = it.category;
      const row = map.get(key) ?? { category: key, total: 0, activeListings: 0 };
      row.total += 1;
      if (it.listing?.status === "ACTIVE") row.activeListings += 1;
      map.set(key, row);
    }

    return [...map.values()].sort(
      (a, b) => b.activeListings - a.activeListings || a.category.localeCompare(b.category),
    );
  },
};
