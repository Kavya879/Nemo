import { returnRepository } from "@/repositories/return.repository";
import { itemRepository } from "@/repositories/item.repository";
import { ReturnRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** POST /api/returns — register a return event for an item (start of the flow). */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, ReturnRequestSchema);
    const item = await itemRepository.findById(input.itemId);
    if (!item) throw new NotFoundError(`Item ${input.itemId} not found.`);

    const created = await returnRepository.create({
      reason: input.reason,
      photos: input.photos,
      item: { connect: { id: input.itemId } },
    });
    await itemRepository.updateStatus(input.itemId, "RETURNED");
    return ok(created, 201);
  } catch (error) {
    return fail(error);
  }
}
