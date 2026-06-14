import { challengeService } from "@/services/challenge/challenge.service";
import { AddChallengeEvidenceSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET /api/challenges/:id — track a single dispute (status + audit trail). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return ok(await challengeService.get(params.id));
  } catch (error) {
    return fail(error);
  }
}

/** POST /api/challenges/:id — seller adds more evidence / a comment. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request, AddChallengeEvidenceSchema);
    const challenge = await challengeService.addEvidence({
      challengeId: params.id,
      actor: body.actor,
      bySeller: body.bySeller ?? true,
      comment: body.comment,
      evidence: body.evidence,
    });
    return ok(challenge);
  } catch (error) {
    return fail(error);
  }
}
