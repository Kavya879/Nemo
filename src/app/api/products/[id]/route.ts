import { productService } from "@/services/products/product.service";
import { NotFoundError } from "@/lib/errors";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/products/:id — a single brand-new product with live availability. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const product = await productService.getById(params.id);
    if (!product) throw new NotFoundError(`Product ${params.id} not found.`);
    return ok(product);
  } catch (error) {
    return fail(error);
  }
}
