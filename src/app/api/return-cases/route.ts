import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { InitiateReturnCaseSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/return-cases?userId= — all return cases for the user. */
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? "demo-user";
    return ok(await returnWorkflowService.list(userId));
  } catch (error) {
    return fail(error);
  }
}

/** POST /api/return-cases — initiate a return decision case. */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, InitiateReturnCaseSchema);
    const created = await returnWorkflowService.initiate(input);
    return ok(created, 201);
  } catch (error) {
    return fail(error);
  }
}
