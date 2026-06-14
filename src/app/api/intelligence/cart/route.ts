import { cartIntelligenceService } from "@/services/intelligence/cart-intelligence.service";
import { CartIntelligenceSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST /api/intelligence/cart — per-line risk, duplicate detection + confidence meter. */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, CartIntelligenceSchema);
    return ok(await cartIntelligenceService.assess(input));
  } catch (error) {
    return fail(error);
  }
}
