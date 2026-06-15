import { z } from "zod";
import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const ChooseRouteSchema = z.object({
  route: z.enum(["RESELL_AS_IS", "REFURBISH", "PEER_TO_PEER", "DONATE", "RECYCLE"]),
  overridden: z.boolean().optional(),
  reason: z.string().optional(),
});

/**
 * POST /api/return-cases/:id/choose-route — apply the Circular Decision Engine's
 * recommendation, or a manual override, to a graded case.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request, ChooseRouteSchema);
    return ok(
      await returnWorkflowService.applyCircularRoute({
        caseId: params.id,
        route: body.route,
        overridden: body.overridden,
        reason: body.reason,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
