import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { ExpireWindowSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/return-cases/:id/expire — window closed with no buyer → liquidation/disposition. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { force } = await parseJsonBody(request, ExpireWindowSchema).catch(() => ({ force: false }));
    return ok(await returnWorkflowService.expire({ caseId: params.id, force }));
  } catch (error) {
    return fail(error);
  }
}
