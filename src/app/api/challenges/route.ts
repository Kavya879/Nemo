import { challengeService } from "@/services/challenge/challenge.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/challenges?userId=… — the signed-in seller's disputes. */
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? "demo-user";
    return ok(await challengeService.list(userId));
  } catch (error) {
    return fail(error);
  }
}
