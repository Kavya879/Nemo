import { productService } from "@/services/products/product.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/products — active brand-new catalog, in-stock first. */
export async function GET() {
  try {
    const products = await productService.listActive();
    return ok(products);
  } catch (error) {
    return fail(error);
  }
}
