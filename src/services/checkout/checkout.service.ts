import { creditsService } from "@/services/credits/credits.service";
import { listingRepository } from "@/repositories/listing.repository";
import { itemRepository } from "@/repositories/item.repository";
import type { CreditTotals } from "@/repositories/credit.repository";

/**
 * Checkout service — the ONLY place a purchase is completed, and therefore the
 * only place green credits are awarded (credits are never granted for merely
 * adding to the cart). Marks the purchased second-life listings as SOLD.
 */

export interface CheckoutLine {
  listingId: string;
  itemId: string;
  category: string;
  originalPrice: number;
  qty: number;
}

export interface CheckoutResult {
  orderRef: string;
  itemCount: number;
  creditsEarned: number;
  co2SavedKg: number;
  costSaved: number;
  totals: CreditTotals;
}

export function createCheckoutService() {
  return {
    async placeOrder(input: {
      userId?: string;
      lines: CheckoutLine[];
    }): Promise<CheckoutResult> {
      const userId = input.userId ?? "demo-user";
      let creditsEarned = 0;
      let co2SavedKg = 0;
      let costSaved = 0;

      for (const line of input.lines) {
        // A completed second-life purchase earns credits (once per line item).
        const award = await creditsService.award({
          action: "PEER_TO_PEER",
          category: line.category,
          originalPrice: line.originalPrice,
          userId,
          itemId: line.itemId,
        });
        creditsEarned += award.credits;
        co2SavedKg += award.co2SavedKg;
        costSaved += award.costSaved;

        // The listing is now sold; take it off the marketplace.
        await listingRepository.updateStatus(line.listingId, "SOLD").catch(() => undefined);
        await itemRepository.updateStatus(line.itemId, "SOLD").catch(() => undefined);
      }

      const totals = await creditsService.totals(userId);
      const orderRef = `RL-${Date.now().toString(36).toUpperCase()}`;

      return {
        orderRef,
        itemCount: input.lines.reduce((s, l) => s + l.qty, 0),
        creditsEarned,
        co2SavedKg: Number(co2SavedKg.toFixed(2)),
        costSaved: Number(costSaved.toFixed(2)),
        totals,
      };
    },
  };
}

export const checkoutService = createCheckoutService();
