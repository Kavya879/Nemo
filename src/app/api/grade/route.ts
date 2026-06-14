import { gradingService } from "@/services/grading/grading.service";
import { verificationService } from "@/services/verification/verification.service";
import { GradeRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/grade — authenticate the product, then grade its condition.
 *
 * When an itemId is supplied the upload is first verified against the catalog
 * product (match + fraud signals) and that assessment rides along with the
 * grade. The grade is always produced here (this endpoint serves the seller
 * "snap & list" flow, which is non-blocking); the blocking verification gate
 * that can halt a RETURN before grading lives in the return-workflow service.
 */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, GradeRequestSchema);

    const verification = input.itemId
      ? await verificationService.verify({ images: input.images, itemId: input.itemId })
      : null;

    const grade = await gradingService.grade({
      ...input,
      ...(verification
        ? {
            verification: {
              productMatchConfidence: verification.productMatchConfidence,
              fraudRiskScore: verification.fraudRiskScore,
            },
          }
        : {}),
    });

    return ok({ verification, grade });
  } catch (error) {
    return fail(error);
  }
}
