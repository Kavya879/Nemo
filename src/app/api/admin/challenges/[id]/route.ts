import { challengeService } from "@/services/challenge/challenge.service";
import { AdminChallengeActionSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET /api/admin/challenges/:id — full ticket for a reviewer. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return ok(await challengeService.get(params.id));
  } catch (error) {
    return fail(error);
  }
}

/**
 * POST /api/admin/challenges/:id — reviewer action:
 * assign (pick up), requestInfo (ask seller), or resolve
 * (uphold / modify / override / reject).
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request, AdminChallengeActionSchema);
    if (body.action === "assign") {
      return ok(await challengeService.assign({ challengeId: params.id, reviewer: body.reviewer }));
    }
    if (body.action === "requestInfo") {
      return ok(
        await challengeService.requestInfo({
          challengeId: params.id,
          reviewer: body.reviewer,
          message: body.message,
        }),
      );
    }
    if (body.action === "decide") {
      return ok(
        await challengeService.decideVerification({
          challengeId: params.id,
          reviewer: body.reviewer,
          decision: body.decision,
          reasoning: body.reasoning,
        }),
      );
    }
    return ok(
      await challengeService.resolve({
        challengeId: params.id,
        reviewer: body.reviewer,
        action: body.resolution,
        revisedGrade: body.revisedGrade,
        reasoning: body.reasoning,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
