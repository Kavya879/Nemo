import { routingService } from "@/services/routing/routing.service";
import { RouteItemRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/route-item — decide the best second-life path for an item. */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, RouteItemRequestSchema);
    const result = await routingService.route(input);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
