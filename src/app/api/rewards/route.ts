import { REWARDS } from "@/config/constants";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/rewards — the redeemable reward catalog. */
export async function GET() {
  try {
    return ok(REWARDS);
  } catch (error) {
    return fail(error);
  }
}
