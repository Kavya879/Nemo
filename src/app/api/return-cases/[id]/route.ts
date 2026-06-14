import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/return-cases/:id — a single case with its full event trail. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return ok(await returnWorkflowService.get(params.id));
  } catch (error) {
    return fail(error);
  }
}
