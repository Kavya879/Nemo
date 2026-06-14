import { listingRepository } from "@/repositories/listing.repository";
import { ListingStatusSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/listings/:id — approve (ACTIVE) / reject (INACTIVE) a listing. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { status } = await parseJsonBody(request, ListingStatusSchema);
    return ok(await listingRepository.updateStatus(params.id, status));
  } catch (error) {
    return fail(error);
  }
}
