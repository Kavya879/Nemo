import { listingService } from "@/services/listing/listing.service";
import { listingRepository } from "@/repositories/listing.repository";
import { CreateListingRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/listings — active marketplace listings. */
export async function GET() {
  try {
    const listings = await listingRepository.listActive();
    return ok(listings);
  } catch (error) {
    return fail(error);
  }
}

/** POST /api/listings — auto-generate + persist a listing for a graded item. */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, CreateListingRequestSchema);
    const listing = await listingService.create({
      itemId: input.itemId,
      grade: input.grade,
      confidence: input.confidence,
      flaws: input.flaws,
      price: input.price,
      pricePct: input.pricePct,
      photoUrl: input.photoUrl ?? null,
      history: input.history,
    });
    return ok(listing, 201);
  } catch (error) {
    return fail(error);
  }
}
