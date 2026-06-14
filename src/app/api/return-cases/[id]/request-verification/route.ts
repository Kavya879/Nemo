import { challengeService } from "@/services/challenge/challenge.service";
import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { RequestVerificationSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/return-cases/:id/request-verification
 * After the AI verification gate has repeatedly failed, the customer escalates
 * to a human (admin) review — files a RETURN_VERIFICATION challenge.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request, RequestVerificationSchema);
    const rc = await returnWorkflowService.get(params.id);
    const challenge = await challengeService.openVerification({
      itemId: rc.itemId,
      returnCaseId: rc.id,
      kind: "RETURN_VERIFICATION",
      reason: body.reason,
      comment: body.comment,
      userId: body.userId ?? rc.userId,
      userName: body.userName,
    });
    return ok(challenge, 201);
  } catch (error) {
    return fail(error);
  }
}
