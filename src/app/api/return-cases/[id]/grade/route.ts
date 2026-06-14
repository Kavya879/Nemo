import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { challengeService } from "@/services/challenge/challenge.service";
import { GradeImagesSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/return-cases/:id/grade — run AI grading on submitted photos. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { images } = await parseJsonBody(request, GradeImagesSchema);
    const rc = await returnWorkflowService.grade({ caseId: params.id, images });

    // AI escalated this case to manual review (fraud / low confidence). Auto-file
    // a verification challenge so the Ops team can Accept/Reject it directly from
    // the Challenge section — no need for the customer to request it. The
    // submitted photos ride along as evidence. Best-effort + de-duplicated, so it
    // never blocks grading and won't create a second ticket on re-submission.
    if (rc.status === "MANUAL_REVIEW") {
      const photos =
        (rc.returnPhotos as unknown as { data: string; mimeType?: string; role?: string }[] | null) ?? [];
      await challengeService
        .openVerification({
          itemId: rc.itemId,
          returnCaseId: rc.id,
          kind: "RETURN_VERIFICATION",
          reason: "Auto-escalated to manual review (AI flagged potential fraud/mismatch)",
          comment:
            "Automatically routed to manual review by the AI verification gate. Review the submitted photos and accept (genuine → resume the return) or reject.",
          userId: rc.userId,
          evidence: photos.map((p) => ({
            data: p.data,
            mimeType: p.mimeType ?? "image/jpeg",
            role: p.role ?? "other",
          })),
        })
        .catch(() => undefined);
    }

    return ok(rc);
  } catch (error) {
    return fail(error);
  }
}
