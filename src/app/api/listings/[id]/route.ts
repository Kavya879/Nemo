import { listingRepository } from "@/repositories/listing.repository";
import { ok, fail } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** GET /api/listings/:id — a single listing with its item (for the product page). */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const listing = await listingRepository.findById(params.id);
    if (!listing) throw new NotFoundError(`Listing ${params.id} not found.`);
    return ok(listing);
  } catch (error) {
    return fail(error);
  }
}
