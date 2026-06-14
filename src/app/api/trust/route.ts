import { trustService } from "@/services/trust/trust.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/trust?userId= — the user's TrustPass seller reputation score. */
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? "demo-user";
    return ok(await trustService.score(userId));
  } catch (error) {
    return fail(error);
  }
}
