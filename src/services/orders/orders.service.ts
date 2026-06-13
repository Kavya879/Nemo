import type { Item, Order } from "@prisma/client";
import { configRepository } from "@/repositories/config.repository";
import { orderRepository } from "@/repositories/order.repository";

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
  deliveredAt: Date,
  status: string,
  windowDays: number,
  now: number,
): EligibilityCheck {
  const deadline = new Date(deliveredAt).getTime() + windowDays * DAY_MS;
  const daysLeft = Math.ceil((deadline - now) / DAY_MS);
  if (status === "RETURNED" || status === "RETURN_REQUESTED") {
    return { eligible: false, reason: "A return is already in progress.", daysLeft };
  }
  if (status !== "DELIVERED") {
    return { eligible: false, reason: "Order not delivered yet.", daysLeft };
  }
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
  };
}

export const ordersService = createOrdersService();
export { computeEligibility };
