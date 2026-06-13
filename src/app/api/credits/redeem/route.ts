import { creditsService } from "@/services/credits/credits.service";
import { RedeemRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/credits/redeem — redeem a reward against the credit balance. */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, RedeemRequestSchema);
    const result = await creditsService.redeem(input.rewardId, input.userId);
    return ok(result, 201);
  } catch (error) {
    return fail(error);
  }
}
