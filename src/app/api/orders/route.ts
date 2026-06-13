import { ordersService } from "@/services/orders/orders.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/orders?userId= — the user's orders annotated with return eligibility. */
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? "demo-user";
    const orders = await ordersService.listForUser(userId);
    return ok(orders);
  } catch (error) {
    return fail(error);
  }
}
