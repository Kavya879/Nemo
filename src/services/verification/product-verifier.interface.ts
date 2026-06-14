import type { RoledImageInput, VerifierOutput, ImageInput } from "@/types";

/**
 * The swappable product-verification contract.
 *
 * A verifier answers a single question BEFORE grading: does the uploaded item
 * actually match the originally purchased product? It compares category, brand,
 * model, packaging and visual appearance against the catalog reference image and
 * the item's known metadata, and flags fraud signals (wrong item, counterfeit,
 * swapped goods). Like the grading layer, everything depends on this interface,
 * never on a concrete implementation (strategy pattern), so Bedrock and CLIP are
 * interchangeable via one config switch.
 */

/** Context the verifier compares the uploaded photos against. */
export interface VerifyContext {
  /** Expected product name (e.g. "Air Zoom Pegasus 40"). */
  name?: string;
  /** Expected brand (e.g. "Nike"). */
  brand?: string | null;
  /** Expected category (e.g. "Footwear"). */
  category?: string;
  /** The catalog/reference product image to compare against. */
  reference?: ImageInput;
}

export interface ProductVerifier {
  /** Stable identifier persisted on the VerificationResult. */
  readonly name: "bedrock" | "clip" | "local";
  /** Assess whether the uploaded images depict the expected product. */
  verify(images: RoledImageInput[], context: VerifyContext): Promise<VerifierOutput>;
}
