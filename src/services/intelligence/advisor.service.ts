import { orderRepository } from "@/repositories/order.repository";
import { returnCaseRepository } from "@/repositories/return-case.repository";
import { round, sampleConfidence, smoothedRate } from "./types";

/**
 * Personalized AI Purchase Advisor — learns from the shopper's OWN orders and
 * returns to summarize their return behaviour, classify a risk profile, and
 * surface concrete, actionable recommendations. Everything is derived from real
 * per-user history; confidence scales with how much history exists.
 */

export interface PurchaseAdvisor {
  userId: string;
  ordersCount: number;
  returnsCount: number;
  returnRate: number; // 0..1
  riskProfile: "low" | "medium" | "high";
  topReasons: { reason: string; count: number }[];
  topCategories: { category: string; count: number }[];
  recommendations: string[];
  confidence: number;
}

function tally<T extends string>(items: T[]): { key: T; count: number }[] {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export function createAdvisorService() {
  return {
    async summary(userId: string): Promise<PurchaseAdvisor> {
      const [orders, cases] = await Promise.all([
        orderRepository.listForUser(userId),
        returnCaseRepository.listForUser(userId),
      ]);

      const ordersCount = orders.length;
      const returnsCount = cases.length;
      const returnRate = smoothedRate(returnsCount, ordersCount, 0.2, 4);
      const confidence = sampleConfidence(ordersCount, 5);

      const topReasons = tally(cases.map((c) => c.reason)).slice(0, 3).map((r) => ({
        reason: r.key,
        count: r.count,
      }));
      const topCategories = tally(cases.map((c) => c.item.category)).slice(0, 3).map((r) => ({
        category: r.key,
        count: r.count,
      }));

      const riskProfile = returnRate >= 0.4 ? "high" : returnRate >= 0.2 ? "medium" : "low";

      // Concrete, actionable recommendations from the real pattern.
      const recommendations: string[] = [];
      const reasonText = topReasons.map((r) => r.reason.toLowerCase()).join(" ");
      if (/size|fit/.test(reasonText)) {
        recommendations.push(
          "Sizing drives several of your returns — check the size guide and verify fit before buying.",
        );
      }
      if (/defect|damage/.test(reasonText)) {
        recommendations.push(
          "You've reported defects — favour items with a high Authenticity & Quality passport score.",
        );
      }
      if (riskProfile === "high") {
        recommendations.push(
          "Your return rate is elevated — use the Digital Twin on each product before checkout.",
        );
      }
      if (topCategories[0]) {
        recommendations.push(
          `Most of your returns are in ${topCategories[0].category} — review that category's risk badges carefully.`,
        );
      }
      if (recommendations.length === 0) {
        recommendations.push(
          confidence < 0.35
            ? "Not much history yet — your advisor sharpens as you shop and return."
            : "Your purchases rarely come back — keep using the return-risk insights to stay on track.",
        );
      }

      return {
        userId,
        ordersCount,
        returnsCount,
        returnRate: round(returnRate),
        riskProfile,
        topReasons,
        topCategories,
        recommendations,
        confidence: round(confidence),
      };
    },
  };
}

export const advisorService = createAdvisorService();
