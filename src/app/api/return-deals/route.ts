import { returnDealsService } from "@/services/return-deals/return-deals.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/return-deals — items in the return pipeline offered to nearby buyers
 * at a dynamically-growing, config-driven discount (Return-in-Transit Deals).
 */
export async function GET() {
  try {
    return ok(await returnDealsService.listActive());
  } catch (error) {
    return fail(error);
  }
}
