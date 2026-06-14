import { z } from "zod";
import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const RejectPickupSchema = z.object({ reason: z.string().min(1) });

/** POST /api/return-cases/:id/reject-pickup — delivery partner rejects a return at pickup. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { reason } = await parseJsonBody(request, RejectPickupSchema);
    return ok(await returnWorkflowService.rejectReturnPickup({ caseId: params.id, reason }));
  } catch (error) {
    return fail(error);
  }
}
