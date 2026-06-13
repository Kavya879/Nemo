import { itemRepository } from "@/repositories/item.repository";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/items — list items available to return/route (demo catalog). */
export async function GET() {
  try {
    const items = await itemRepository.list();
    return ok(items);
  } catch (error) {
    return fail(error);
  }
}
