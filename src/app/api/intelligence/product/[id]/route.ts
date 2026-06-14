import { intelligenceService } from "@/services/intelligence/intelligence.service";
import { listingRepository } from "@/repositories/listing.repository";
import { itemRepository } from "@/repositories/item.repository";
import { NotFoundError } from "@/lib/errors";
import { ok, fail } from "@/lib/api-response";
import type { ProductIntelligenceDTO } from "@/types/dto";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/intelligence/product/:id?userId=
 * `id` is a listing id (resolves to its item) or an item id. Returns the
 * ensemble Return Risk Score, the AI Product Passport, and a review summary.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? undefined;

    // Resolve a listing id to its item; fall back to treating id as an item id.
    const listing = await listingRepository.findById(params.id);
    let itemId = listing?.itemId;
    if (!itemId) {
      const item = await itemRepository.findById(params.id);
      itemId = item?.id;
    }
    if (!itemId) throw new NotFoundError(`No product found for ${params.id}.`);

    const intel = await intelligenceService.productIntelligence(itemId, userId);

    const dto: ProductIntelligenceDTO = {
      itemId,
      returnRisk: {
        itemId,
        score: intel.returnRisk.score,
        level: intel.returnRisk.level,
        confidence: intel.returnRisk.confidence,
        reasons: intel.returnRisk.reasons,
      },
      passport: intel.passport,
      twin: intel.twin,
      cohort: intel.cohort,
      ownership: intel.ownership,
      compatibility: intel.compatibility,
      reviews: {
        count: intel.reviews.count,
        avgRating: intel.reviews.avgRating,
        avgSentiment: intel.reviews.avgSentiment,
        positive: intel.reviews.positive,
        critical: intel.reviews.critical,
        expectationMismatch: intel.reviews.expectationMismatch,
      },
    };
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
