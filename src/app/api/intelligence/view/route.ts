import { prisma } from "@/lib/db";
import { RecordViewSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** POST /api/intelligence/view — record a product view (browsing history). */
export async function POST(request: Request) {
  try {
    const { itemId, listingId, userId } = await parseJsonBody(request, RecordViewSchema);
    await prisma.productView.create({
      data: { itemId, listingId: listingId ?? null, userId: userId ?? "demo-user" },
    });
    return ok({ recorded: true });
  } catch (error) {
    return fail(error);
  }
}
