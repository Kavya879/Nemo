import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/return-cases/:id/find-buyer — search nearby buyers; reserve nearest if found. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await returnWorkflowService.findBuyer({ caseId: params.id });
    return ok({ found: result.found, case: result.case });
  } catch (error) {
    return fail(error);
  }
}
