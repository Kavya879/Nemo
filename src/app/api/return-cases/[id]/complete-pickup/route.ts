import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/return-cases/:id/complete-pickup — feasible path: item collected → returned to seller. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    return ok(await returnWorkflowService.completeReturnPickup({ caseId: params.id }));
  } catch (error) {
    return fail(error);
  }
}
