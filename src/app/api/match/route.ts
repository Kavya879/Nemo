import { matchingService } from "@/services/matching/matching.service";
import { MatchQuerySchema } from "@/types/api";
import { parseQuery } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/match?category=&lat=&lng=&radiusKm= — nearby buyers for an item. */
export async function GET(request: Request) {
  try {
    const q = parseQuery(request.url, MatchQuerySchema);
    const matches = await matchingService.findNearby({
      category: q.category,
      origin: { lat: q.lat, lng: q.lng },
      radiusKm: q.radiusKm,
    });
    return ok({ matches, count: matches.length });
  } catch (error) {
    return fail(error);
  }
}
