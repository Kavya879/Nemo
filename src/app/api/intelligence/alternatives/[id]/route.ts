import { alternativesService } from "@/services/intelligence/alternatives.service";
import { listingRepository } from "@/repositories/listing.repository";
import { ok, fail } from "@/lib/api-response";
import type { AlternativeItem } from "@/services/intelligence/alternatives.service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/intelligence/alternatives/:id?userId=
 * Lower-return-risk alternatives in the same category. `id` is a listing or item id.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? undefined;
    const listing = await listingRepository.findById(params.id);
    const itemId = listing?.itemId ?? params.id;
    const alternatives: AlternativeItem[] = await alternativesService.forItem(itemId, userId);
    return ok(alternatives);
  } catch (error) {
    return fail(error);
  }
}
