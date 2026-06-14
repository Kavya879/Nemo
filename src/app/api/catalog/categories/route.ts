import { categoryRepository } from "@/repositories/category.repository";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/catalog/categories — live category taxonomy derived from the catalog. */
export async function GET() {
  try {
    return ok(await categoryRepository.distinctWithCounts());
  } catch (error) {
    return fail(error);
  }
}
