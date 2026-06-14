import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { DonationDecisionSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/return-cases/:id/donation-decision — donate through Amazon, or discard. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { action } = await parseJsonBody(request, DonationDecisionSchema);
    return ok(await returnWorkflowService.donationDecision({ caseId: params.id, action }));
  } catch (error) {
    return fail(error);
  }
}
