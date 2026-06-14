import { challengeService } from "@/services/challenge/challenge.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/admin/challenges — the full review queue (all sellers). */
export async function GET() {
  try {
    return ok(await challengeService.listAll());
  } catch (error) {
    return fail(error);
  }
}
