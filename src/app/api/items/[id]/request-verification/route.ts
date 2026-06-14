import { challengeService } from "@/services/challenge/challenge.service";
import { RequestVerificationSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/items/:id/request-verification
 * Sell flow: after the AI repeatedly flagged a genuine item as fraud, the seller
 * escalates to a human (admin) review — files a SELL_VERIFICATION challenge. The
 * intended listing price is captured so the listing can be created on accept.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request, RequestVerificationSchema);
    const challenge = await challengeService.openVerification({
      itemId: params.id,
      kind: "SELL_VERIFICATION",
      reason: body.reason,
      comment: body.comment,
      userId: body.userId ?? "demo-user",
      userName: body.userName,
      evidence: body.evidence,
      intendedPrice: body.intendedPrice,
      intendedPricePct: body.intendedPricePct,
    });
    return ok(challenge, 201);
  } catch (error) {
    return fail(error);
  }
}
