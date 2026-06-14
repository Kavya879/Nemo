import { checkoutService } from "@/services/checkout/checkout.service";
import { CheckoutRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/checkout — complete the purchase: award credits + mark items sold. */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, CheckoutRequestSchema);
    const result = await checkoutService.placeOrder(input);
    return ok(result, 201);
  } catch (error) {
    return fail(error);
  }
}
