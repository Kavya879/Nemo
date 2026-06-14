import { z } from "zod";
import { giveService } from "@/services/give/give.service";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const DonateSchema = z.object({
  itemId: z.string().min(1),
  charityId: z.string().min(1),
  userId: z.string().optional(),
});

/** POST /api/give/donate — donate an owned item to a charity partner. */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, DonateSchema);
    return ok(await giveService.donate(body), 201);
  } catch (error) {
    return fail(error);
  }
}

/** GET /api/give/donate — list charity partners. */
export async function GET() {
  try {
    return ok(giveService.charities());
  } catch (error) {
    return fail(error);
  }
}
