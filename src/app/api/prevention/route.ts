import { preventionService } from "@/services/prevention/prevention.service";
import { PreventionQuerySchema } from "@/types/api";
import { parseQuery } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** GET /api/prevention?category=&profile=<json> — pre-purchase guidance. */
export async function GET(request: Request) {
  try {
    const q = parseQuery(request.url, PreventionQuerySchema);
    let profile: Record<string, string> | undefined;
    if (q.profile) {
      try {
        profile = JSON.parse(q.profile);
      } catch {
        throw new ValidationError("`profile` must be a JSON-encoded object.");
      }
    }
    const result = await preventionService.guide({ category: q.category, profile });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
