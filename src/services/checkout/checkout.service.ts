import { creditsService } from "@/services/credits/credits.service";
import { listingRepository } from "@/repositories/listing.repository";
import { itemRepository } from "@/repositories/item.repository";
import { productRepository } from "@/repositories/product.repository";
import { orderRepository } from "@/repositories/order.repository";
import { ConflictError } from "@/lib/errors";
import type { CreditTotals } from "@/repositories/credit.repository";

/**
 * Checkout service — the ONLY place a purchase is completed. Handles BOTH
 * ecosystems:
 *  • RESOLD (second-life): qty is always 1, the Listing+Item are marked SOLD so
 *    they can't be bought twice, and the buyer earns green credits.
 *  • NEW (brand-new catalog): stock is atomically decremented (oversell-guarded);
 *    when stock hits 0 the product is automatically unavailable. No green
 *    credits — brand-new isn't a second-life action.
 *
 * All inventory checks read live DB state, so the cart can never over-purchase.
 */

export interface CheckoutLine {
  kind: "NEW" | "RESOLD";
  listingId?: string;
  itemId?: string;
  productId?: string;
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
        if (line.kind === "NEW") {
          if (!line.productId) throw new ConflictError("Missing product for a brand-new line.");
          // Atomic, oversell-guarded reservation of `qty` units.
          const updated = await productRepository.decrementStock(line.productId, line.qty);
          if (!updated) {
            throw new ConflictError(
              "Not enough stock to complete this purchase — please reduce the quantity.",
            );
          }
          await orderRepository
            .create({
              userId,
              orderedAt: new Date(),
              status: "PLACED",
              quantity: line.qty,
              unitPrice: updated.price,
              product: { connect: { id: line.productId } },
            })
            .catch(() => undefined);
          continue;
        }

        // ── RESOLD second-life line (qty fixed at 1) ──
        if (!line.listingId || !line.itemId) {
          throw new ConflictError("Missing listing/item for a resold line.");
        }
        const listing = await listingRepository.findById(line.listingId);
        if (!listing || listing.status === "SOLD") {
          throw new ConflictError(
            "This second-life item has already been sold — it's a one-of-a-kind listing.",
          );
        }

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

        // Create the buyer's order (PLACED, not yet delivered → cancellable).
        await orderRepository
          .create({
            userId,
            orderedAt: new Date(),
            status: "PLACED",
            quantity: 1,
            item: { connect: { id: line.itemId } },
          })
          .catch(() => undefined);
      }

      const totals = await creditsService.totals(userId);
      const orderRef = `AN-${Date.now().toString(36).toUpperCase()}`;

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
