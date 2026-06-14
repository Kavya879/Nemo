import { returnRepository } from "@/repositories/return.repository";
import { itemRepository } from "@/repositories/item.repository";
import { orderRepository } from "@/repositories/order.repository";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CancelSchema = z.object({ itemId: z.string().min(1), userId: z.string().optional() });

/**
 * POST /api/returns/cancel — cancel a return request (user changed their mind).
 * Deletes the latest return for the item and restores the order to DELIVERED.
 */
export async function POST(request: Request) {
  try {
    const { itemId, userId } = await parseJsonBody(request, CancelSchema);

    const removed = await returnRepository.deleteLatestForItem(itemId);

    // Restore the order so it's returnable again (within its window).
    const order = await orderRepository.findByItem(itemId, userId ?? "demo-user");
    if (order) await orderRepository.updateStatus(order.id, "DELIVERED");

    // Restore the item status (items have no DELIVERED state; GRADED is the
    // pre-return resting state for seeded catalog items).
    const item = await itemRepository.findById(itemId);
    if (item && item.status === "RETURNED") {
      await itemRepository.updateStatus(itemId, "GRADED");
    }

    return ok({ cancelled: removed });
  } catch (error) {
    return fail(error);
  }
}
