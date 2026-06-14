import { creditRepository } from "@/repositories/credit.repository";
import { challengeRepository } from "@/repositories/challenge.repository";

/**
 * TrustPass — a seller/contributor reputation score, ported from SecondLife and
 * grounded in OUR real data: how many verified second-life contributions a user
 * has made, and how accurate their AI-graded listings proved (a grade overturned
 * on dispute counts against accuracy).
 *
 *   score = 60 + (accurate / total) × 40        (clamped 60–100)
 */

export type TrustBadge = "⭐ Platinum Seller" | "🥇 Gold Seller" | "🥈 Silver Seller" | "🥉 New Seller";

export interface TrustScore {
  userId: string;
  score: number;
  badge: TrustBadge;
  contributions: number;
  accurate: number;
  total: number;
  co2SavedKg: number;
}

function badgeFor(score: number): TrustBadge {
  if (score >= 90) return "⭐ Platinum Seller";
  if (score >= 75) return "🥇 Gold Seller";
  if (score >= 60) return "🥈 Silver Seller";
  return "🥉 New Seller";
}

export const trustService = {
  async score(userId = "demo-user"): Promise<TrustScore> {
    const [credits, challenges] = await Promise.all([
      creditRepository.listForUser(userId),
      challengeRepository.listForUser(userId),
    ]);

    const contributions = credits.length;
    const co2SavedKg = Number(credits.reduce((s, c) => s + (c.co2SavedKg ?? 0), 0).toFixed(1));
    // A grade overturned on dispute (modified/overridden) means an inaccurate listing.
    const overturned = challenges.filter(
      (c) => c.resolution === "MODIFY" || c.resolution === "OVERRIDE",
    ).length;

    const total = Math.max(contributions, challenges.length);
    const accurate = Math.max(total - overturned, 0);
    const score = total === 0 ? 60 : Math.round(60 + (accurate / total) * 40);

    return { userId, score, badge: badgeFor(score), contributions, accurate, total, co2SavedKg };
  },
};
