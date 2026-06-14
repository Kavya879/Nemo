import { challengeService } from "@/services/challenge/challenge.service";
import { OpenChallengeSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST /api/return-cases/:id/challenge — seller disputes the AI verdict. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request, OpenChallengeSchema);
    const challenge = await challengeService.open({
      returnCaseId: params.id,
      reason: body.reason,
      comment: body.comment,
      userId: body.userId ?? "demo-user",
      userName: body.userName,
      evidence: body.evidence,
    });
    return ok(challenge);
  } catch (error) {
    return fail(error);
  }
}
