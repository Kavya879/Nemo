import { orderRepository } from "@/repositories/order.repository";
import { returnRiskService } from "./return-risk.service";
import { clamp01 } from "./types";

/**
 * Cart / checkout intelligence — runs the return-prevention engine across a
 * cart: per-line return risk, duplicate-purchase detection (the shopper already
 * owns this item or a near-identical one), wrong-purchase flags, and an
 * aggregate Purchase-Confidence Meter + concise smart warnings for checkout.
 */

export interface CartLineInput {
  listingId: string;
  itemId: string;
  category: string;
  originalPrice: number;
  title?: string;
}

export interface CartLineAssessment {
  listingId: string;
  itemId: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  duplicate: boolean;
  wrongPurchase: boolean;
  note?: string;
}

export interface CartAssessment {
  lines: CartLineAssessment[];
  confidenceMeter: number; // 0..100 (higher = safer to buy)
  warnings: string[];
}

const OWNED_STATUSES = new Set(["PLACED", "SHIPPED", "DELIVERED"]);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function createCartIntelligenceService() {
  return {
    async assess(input: { userId?: string; lines: CartLineInput[] }): Promise<CartAssessment> {
      const userId = input.userId ?? "demo-user";
      const owned = await orderRepository.listForUser(userId);
      const ownedActive = owned.filter((o) => OWNED_STATUSES.has(o.status));
      const ownedItemIds = new Set(ownedActive.map((o) => o.itemId));
      const ownedNames = ownedActive.map((o) => ({ name: norm(o.item.name), brand: o.item.brand }));

      const lines: CartLineAssessment[] = await Promise.all(
        input.lines.map(async (l) => {
          const risk = await returnRiskService.assess(l.itemId, userId).catch(() => null);
          const level = risk?.level ?? "medium";
          const score = risk?.score ?? 40;

          // Duplicate: same item already owned, or a near-identical title/brand owned.
          const exact = ownedItemIds.has(l.itemId);
          const similar =
            !exact &&
            !!l.title &&
            ownedNames.some(
              (o) => o.name && norm(l.title as string).length > 4 && o.name === norm(l.title as string),
            );
          const duplicate = exact || similar;
          const wrongPurchase = duplicate || level === "high";

          let note: string | undefined;
          if (exact) note = "You already own this item — buying again may be a duplicate.";
          else if (similar) note = "You already own a very similar item.";
          else if (level === "high") note = "High return risk for your profile — review before buying.";

          return {
            listingId: l.listingId,
            itemId: l.itemId,
            riskLevel: level,
            riskScore: score,
            duplicate,
            wrongPurchase,
            note,
          };
        }),
      );

      // Confidence meter: mean per-line success, penalised by duplicates / high-risk lines.
      const meanSuccess =
        lines.length === 0
          ? 1
          : lines.reduce((s, l) => s + (100 - l.riskScore) / 100, 0) / lines.length;
      const dupCount = lines.filter((l) => l.duplicate).length;
      const highCount = lines.filter((l) => l.riskLevel === "high").length;
      const penalty = clamp01(0.12 * dupCount + 0.1 * highCount);
      const confidenceMeter = Math.round(clamp01(meanSuccess - penalty) * 100);

      const warnings: string[] = [];
      if (dupCount > 0)
        warnings.push(`${dupCount} item(s) look like a duplicate of something you already own.`);
      if (highCount > 0)
        warnings.push(`${highCount} item(s) have high return risk for your profile.`);
      if (warnings.length === 0)
        warnings.push("No issues detected — your cart looks like a confident purchase.");

      return { lines, confidenceMeter, warnings };
    },
  };
}

export const cartIntelligenceService = createCartIntelligenceService();
