import { listingService } from "@/services/listing/listing.service";
import { listingRepository } from "@/repositories/listing.repository";
import { intelligenceService } from "@/services/intelligence/intelligence.service";
import { CreateListingRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/listings — active marketplace listings, each with a compact return-risk badge. */
export async function GET() {
  try {
    const listings = await listingRepository.listActive();
    // Attach the ensemble return-risk level per card (reuses the shared engine).
    const enriched = await Promise.all(
      listings.map(async (l) => {
        try {
          const risk = await intelligenceService.cardRisk(l.itemId);
          return { ...l, returnRiskLevel: risk.level, returnRiskScore: risk.score };
        } catch {
          return l; // never block the catalog on a risk computation
        }
      }),
    );
    return ok(enriched);
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
