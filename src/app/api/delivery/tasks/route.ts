import { deliveryService } from "@/services/delivery/delivery.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/delivery/tasks — the delivery partner's daily pickups, verifications & drops. */
export async function GET() {
  try {
    return ok(await deliveryService.board());
  } catch (error) {
    return fail(error);
  }
}
