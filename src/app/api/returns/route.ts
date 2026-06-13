import { returnRepository } from "@/repositories/return.repository";
import { itemRepository } from "@/repositories/item.repository";
import { orderRepository } from "@/repositories/order.repository";
import { ordersService } from "@/services/orders/orders.service";
import { ReturnRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";
import { ConflictError, NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/returns — register a return for an item, ONLY if it's a delivered
 * order still inside the return window. Eligibility is enforced server-side.
 */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, ReturnRequestSchema);
    const item = await itemRepository.findById(input.itemId);
    if (!item) throw new NotFoundError(`Item ${input.itemId} not found.`);

    const eligibility = await ordersService.checkReturnEligibility(input.itemId);
    if (!eligibility.eligible) {
      throw new ConflictError(
        eligibility.reason ?? "This item is not eligible for return.",
      );
    }

    const created = await returnRepository.create({
      reason: input.reason,
      photos: input.photos,
      item: { connect: { id: input.itemId } },
    });
    await itemRepository.updateStatus(input.itemId, "RETURNED");
    if (eligibility.orderId) {
      await orderRepository.updateStatus(eligibility.orderId, "RETURN_REQUESTED");
    }
    return ok(created, 201);
  } catch (error) {
    return fail(error);
  }
}
