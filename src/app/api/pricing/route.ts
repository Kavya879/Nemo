import { pricingService } from "@/services/pricing/pricing.service";
import { PriceRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/pricing — suggested resale price for a graded item. */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, PriceRequestSchema);
    const result = await pricingService.price(input);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
