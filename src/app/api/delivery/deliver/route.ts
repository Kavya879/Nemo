import { z } from "zod";
import { orderRepository } from "@/repositories/order.repository";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const DeliverSchema = z.object({ orderId: z.string().min(1) });

/** POST /api/delivery/deliver — delivery partner hands a sold item to the buyer. */
export async function POST(request: Request) {
  try {
    const { orderId } = await parseJsonBody(request, DeliverSchema);
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError(`Order ${orderId} not found.`);
    return ok(await orderRepository.markDelivered(orderId));
  } catch (error) {
    return fail(error);
  }
}
