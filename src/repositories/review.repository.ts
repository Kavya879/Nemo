import type { Prisma, Review } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scoreSentiment } from "@/services/intelligence/nlp-pipeline";

export interface ReviewAggregate {
  count: number;
  avgRating: number | null;
  /** Mean cached sentiment in -1..1 over reviews that have a score. */
  avgSentiment: number | null;
  scoredCount: number;
}

/**
 * Review repository — data access for product reviews. On create it computes and
 * caches the open-source sentiment score once, so reads never load a model.
 */
export const reviewRepository = {
  async create(
    data: Omit<Prisma.ReviewCreateInput, "sentiment">,
  ): Promise<Review> {
    const sentiment = await scoreSentiment(`${data.title ?? ""} ${data.body}`.trim());
    return prisma.review.create({
      data: { ...data, ...(sentiment != null ? { sentiment } : {}) },
    });
  },

  /** Bulk insert for seeding — scores sentiment for each row up front. */
  async createManyForItem(
    itemId: string,
    rows: Array<{ userId?: string; authorName?: string; rating: number; title?: string; body: string }>,
  ): Promise<number> {
    const data = await Promise.all(
      rows.map(async (r) => ({
        itemId,
        userId: r.userId ?? "demo-user",
        authorName: r.authorName ?? null,
        rating: r.rating,
        title: r.title ?? null,
        body: r.body,
        sentiment: await scoreSentiment(`${r.title ?? ""} ${r.body}`.trim()),
      })),
    );
    const res = await prisma.review.createMany({ data });
    return res.count;
  },

  listForItem(itemId: string, limit = 50): Promise<Review[]> {
    return prisma.review.findMany({
      where: { itemId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async aggregateForItem(itemId: string): Promise<ReviewAggregate> {
    const [agg, scored] = await Promise.all([
      prisma.review.aggregate({
        where: { itemId },
        _count: true,
        _avg: { rating: true, sentiment: true },
      }),
      prisma.review.count({ where: { itemId, sentiment: { not: null } } }),
    ]);
    return {
      count: agg._count,
      avgRating: agg._avg.rating,
      avgSentiment: agg._avg.sentiment,
      scoredCount: scored,
    };
  },
};
