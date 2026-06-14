import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { VerifyTransferSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/return-cases/:id/verify — delivery partner approves/rejects the transfer. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { approved, notes } = await parseJsonBody(request, VerifyTransferSchema);
    return ok(await returnWorkflowService.verify({ caseId: params.id, approved, notes }));
  } catch (error) {
    return fail(error);
  }
}
