import { z } from "zod";
import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const ResolveRejectionSchema = z.object({
  action: z.enum(["KEEP", "REMOVE"]),
  reviewer: z.string().min(1),
  reason: z.string().optional(),
});

/**
 * POST /api/admin/return-cases/:id/resolve-rejection — admin resolves a
 * delivery-partner rejection of a second-hand item: KEEP it in the store
 * (relist) or REMOVE it from the store completely.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request, ResolveRejectionSchema);
    return ok(
      await returnWorkflowService.resolveDeliveryRejection({
        caseId: params.id,
        action: body.action,
        reviewer: body.reviewer,
        reason: body.reason,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
