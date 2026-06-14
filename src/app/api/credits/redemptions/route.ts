import { creditsService } from "@/services/credits/credits.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/credits/redemptions?userId= — redeemed coupons with codes + links. */
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? "demo-user";
    const redemptions = await creditsService.redemptions(userId);
    return ok(redemptions);
  } catch (error) {
    return fail(error);
  }
}
