import { z } from "zod";
import { giveService } from "@/services/give/give.service";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const PeerSchema = z.object({
  itemId: z.string().min(1),
  userId: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

/** POST /api/give/peer — pass an owned item to a verified nearby buyer. */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, PeerSchema);
    const origin = body.lat != null && body.lng != null ? { lat: body.lat, lng: body.lng } : undefined;
    return ok(
      await giveService.passToNeighbour({ itemId: body.itemId, userId: body.userId, origin }),
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
