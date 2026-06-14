import type { Item, Order } from "@prisma/client";
import { configRepository } from "@/repositories/config.repository";
import { orderRepository } from "@/repositories/order.repository";
import { listingRepository } from "@/repositories/listing.repository";
import { itemRepository } from "@/repositories/item.repository";
import { productRepository } from "@/repositories/product.repository";
import { ConflictError, NotFoundError } from "@/lib/errors";

/**
 * Orders service — returns a customer's orders annotated with return
 * eligibility. An order is returnable only when it's DELIVERED and still within
 * the configured return window (config.returnWindowDays) after delivery.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EligibleOrder {
  order: Order & { item: Item };
  returnEligible: boolean;
  returnDaysLeft: number;
  returnWindowDays: number;
  reasonIfNot?: string;
}

export interface EligibilityCheck {
  eligible: boolean;
  reason?: string;
  daysLeft: number;
}

function computeEligibility(
  deliveredAt: Date | null,
  status: string,
  windowDays: number,
  now: number,
): EligibilityCheck {
  if (status === "CANCELLED") {
    return { eligible: false, reason: "Order was cancelled.", daysLeft: 0 };
  }
  if (status === "RETURNED" || status === "RETURN_REQUESTED") {
    return { eligible: false, reason: "A return is already in progress.", daysLeft: 0 };
  }
  if (status !== "DELIVERED" || !deliveredAt) {
    return { eligible: false, reason: "Order not delivered yet.", daysLeft: 0 };
  }
  const deadline = new Date(deliveredAt).getTime() + windowDays * DAY_MS;
  const daysLeft = Math.ceil((deadline - now) / DAY_MS);
  if (now > deadline) {
    return {
      eligible: false,
      reason: `Return window closed (${windowDays} days after delivery).`,
      daysLeft,
    };
  }
  return { eligible: true, daysLeft };
}

export function createOrdersService(now: () => number = () => Date.now()) {
  return {
    async listForUser(userId = "demo-user"): Promise<EligibleOrder[]> {
      const config = await configRepository.getRules();
      const orders = await orderRepository.listForUser(userId);
      const t = now();
      return orders.map((order) => {
        const e = computeEligibility(
          order.deliveredAt,
          order.status,
          config.returnWindowDays,
          t,
        );
        return {
          order,
          returnEligible: e.eligible,
          returnDaysLeft: Math.max(e.daysLeft, 0),
          returnWindowDays: config.returnWindowDays,
          reasonIfNot: e.reason,
        };
      });
    },

    /** Used by the returns route to enforce eligibility server-side. */
    async checkReturnEligibility(
      itemId: string,
      userId = "demo-user",
    ): Promise<EligibilityCheck & { orderId?: string }> {
      const config = await configRepository.getRules();
      const order = await orderRepository.findByItem(itemId, userId);
      if (!order) {
        return { eligible: false, reason: "No matching order to return.", daysLeft: 0 };
      }
      const e = computeEligibility(
        order.deliveredAt,
        order.status,
        config.returnWindowDays,
        now(),
      );
      return { ...e, orderId: order.id };
    },

    /**
     * Cancel an order before delivery (allowed while PLACED or SHIPPED) and
     * restore inventory: a cancellation reverses the purchase, so the item's
     * marketplace listing goes back ACTIVE and the item back to LISTED — it
     * automatically reappears in the main inventory. Mirrors what checkout did
     * (listing → SOLD, item → SOLD) so stock stays consistent.
     */
    async cancelOrder(orderId: string): Promise<Order> {
      const order = await orderRepository.findById(orderId);
      if (!order) throw new NotFoundError(`Order ${orderId} not found.`);
      if (order.status === "CANCELLED") return order;
      if (order.status === "DELIVERED" || order.status === "RETURNED" || order.status === "RETURN_REQUESTED") {
        throw new ConflictError(
          "This order has already been delivered and can no longer be cancelled. Start a return instead.",
        );
      }

      const cancelled = await orderRepository.updateStatus(orderId, "CANCELLED");

      // Restore inventory. Best-effort — never block the cancellation on it.
      try {
        if (order.productId) {
          // Brand-new product: return the purchased units to stock.
          await productRepository.incrementStock(order.productId, order.quantity ?? 1);
        } else if (order.itemId) {
          // Resold item: put it back on the marketplace if this purchase had
          // taken it off (listing → SOLD, item → SOLD).
          const listing = await listingRepository.findByItemId(order.itemId);
          if (listing && listing.status === "SOLD") {
            await listingRepository.updateStatus(listing.id, "ACTIVE");
            await itemRepository.updateStatus(order.itemId, "LISTED");
          }
        }
      } catch {
        /* inventory restore is best-effort; the order is already cancelled */
      }

      return cancelled;
    },
  };
}

export const ordersService = createOrdersService();
export { computeEligibility };
