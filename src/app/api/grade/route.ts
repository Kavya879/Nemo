import { gradingService } from "@/services/grading/grading.service";
import { GradeRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/grade — grade product photos. */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, GradeRequestSchema);
    const result = await gradingService.grade(input);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
