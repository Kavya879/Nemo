import { circularDecisionService } from "@/services/decision-engine/circular-decision.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/return-cases/:id/decision — the Circular Commerce Decision Engine's
 * live recommendation for a graded case (route + confidence + reasoning + factor
 * breakdown + economics + sustainability + the five-route comparison).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return ok(await circularDecisionService.recommendForCase(params.id));
  } catch (error) {
    return fail(error);
  }
}
