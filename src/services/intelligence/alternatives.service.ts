import { itemRepository } from "@/repositories/item.repository";
import { listingRepository } from "@/repositories/listing.repository";
import { NotFoundError } from "@/lib/errors";
import { returnRiskService } from "./return-risk.service";

/**
 * Alternative Product Recommendations — suggests lower-return-risk options in the
 * same category as the product being viewed. Ranked by the ensemble return-risk
 * score (lower is safer), so the shopper can swap a risky pick for a safer one.
 */

export interface AlternativeItem {
  listingId: string;
  itemId: string;
  title: string;
  price: number;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  reason: string;
}

export function createAlternativesService() {
  return {
    async forItem(itemId: string, userId?: string, limit = 3): Promise<AlternativeItem[]> {
      const item = await itemRepository.findById(itemId);
      if (!item) throw new NotFoundError(`Item ${itemId} not found.`);

      const listings = await listingRepository.listActive(50);
      const candidates = listings.filter(
        (l) => l.item.category === item.category && l.itemId !== itemId,
      );

      const scored = await Promise.all(
        candidates.map(async (l) => {
          const risk = await returnRiskService.assess(l.itemId, userId).catch(() => null);
          return {
            listingId: l.id,
            itemId: l.itemId,
            title: l.title,
            price: l.price,
            riskLevel: risk?.level ?? ("medium" as const),
            riskScore: risk?.score ?? 50,
          };
        }),
      );

      return scored
        .sort((a, b) => a.riskScore - b.riskScore)
        .slice(0, limit)
        .map((a) => ({
          ...a,
          reason:
            a.riskLevel === "low"
              ? `Low return risk (${a.riskScore})`
              : `Lower return risk (${a.riskScore})`,
        }));
    },
  };
}

export const alternativesService = createAlternativesService();
