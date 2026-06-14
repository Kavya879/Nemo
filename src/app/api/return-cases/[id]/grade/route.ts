import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { GradeImagesSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/return-cases/:id/grade — run AI grading on submitted photos. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { images } = await parseJsonBody(request, GradeImagesSchema);
    return ok(await returnWorkflowService.grade({ caseId: params.id, images }));
  } catch (error) {
    return fail(error);
  }
}
