import { itemRepository } from "@/repositories/item.repository";
import { CreateItemRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
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

/** POST /api/items — create a seller's own item (incl. not-on-platform goods). */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, CreateItemRequestSchema);
    const item = await itemRepository.create({
      name: input.name,
      category: input.category,
      brand: input.brand,
      originalPrice: input.originalPrice,
      repairability: input.repairability ?? 0.5,
      status: "GRADED",
    });
    return ok(item, 201);
  } catch (error) {
    return fail(error);
  }
}
