import { z } from "zod";
import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const EscalateSchema = z.object({ reason: z.string().optional() });

/**
 * POST /api/return-cases/:id/escalate — the automatic route recommendation isn't
 * satisfactory; escalate the case to Operations (manual review).
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { reason } = await parseJsonBody(request, EscalateSchema);
    return ok(await returnWorkflowService.escalateForReview({ caseId: params.id, reason }));
  } catch (error) {
    return fail(error);
  }
}
