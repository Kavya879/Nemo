import { ordersService } from "@/services/orders/orders.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/orders/:id/cancel — cancel an order before delivery. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    return ok(await ordersService.cancelOrder(params.id));
  } catch (error) {
    return fail(error);
  }
}
