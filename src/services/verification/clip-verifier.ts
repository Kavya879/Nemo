import { UpstreamError, ValidationError } from "@/lib/errors";
import {
  cosine,
  getExtractor,
  getZeroShot,
  rawImageFromInput,
} from "@/services/vision/clip-pipeline";
import {
  VerifierOutputSchema,
  type RoledImageInput,
  type VerificationDeviation,
  type VerifierOutput,
} from "@/types";
import type { ProductVerifier, VerifyContext } from "./product-verifier.interface";

/**
 * CLIP verifier — open-source, in-process product authentication. Derives every
 * score from real model signals (no hardcoded outcomes):
 *  - visual similarity: cosine of the uploaded photo's embedding vs the catalog
 *    reference embedding (how the item shipped),
 *  - category match: zero-shot probability the photo is the expected category
 *    against distractor categories,
 *  - brand match: zero-shot "a photo of a {brand} {category}" vs a generic one,
 *  - packaging: scored only when a packaging photo is supplied,
 *  - model: approximated from visual similarity to the reference.
 * Fraud risk rises as these signals fall (especially a strong visual deviation).
 */

const DISTRACTOR_CATEGORIES = [
  "footwear",
  "electronics",
  "apparel",
  "home goods",
  "books",
  "toys",
  "furniture",
  "kitchenware",
];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round = (n: number) => Number(n.toFixed(3));

export function createClipVerifier(): ProductVerifier {
  return {
    name: "clip",
    async verify(images: RoledImageInput[], context: VerifyContext): Promise<VerifierOutput> {
      if (images.length === 0) {
        throw new ValidationError("CLIP verifier received no images.");
      }

      const category = (context.category ?? "product").toLowerCase();
      const brand = context.brand?.trim();
      const primary = images.find((i) => i.role === "front") ?? images[0];
      const packagingImg = images.find((i) => i.role === "packaging");

      let visual: number | null = null;
      let categoryScore: number;
      let brandScore: number;
      let packagingScore = 0.5; // neutral when no packaging photo supplied

      try {
        const classify = await getZeroShot();
        const primaryRaw = await rawImageFromInput(primary);

        // Category match — probability mass on the expected category.
        const catLabels = Array.from(new Set([category, ...DISTRACTOR_CATEGORIES])).map(
          (c) => `a photo of ${c}`,
        );
        const catResults = await classify(primaryRaw, catLabels);
        categoryScore =
          catResults.find((r) => r.label === `a photo of ${category}`)?.score ?? 0;

        // Brand match — only meaningful when a brand is known.
        if (brand) {
          const brandResults = await classify(primaryRaw, [
            `a photo of a ${brand} ${category}`,
            `a photo of a generic unbranded ${category}`,
            `a photo of a counterfeit ${category}`,
          ]);
          brandScore =
            brandResults.find((r) => r.label === `a photo of a ${brand} ${category}`)?.score ?? 0;
        } else {
          brandScore = 0.5;
        }

        // Packaging — score only if a packaging photo was provided.
        if (packagingImg) {
          const pkgResults = await classify(await rawImageFromInput(packagingImg), [
            "authentic retail product packaging or branded box",
            "a product with no packaging",
            "damaged, fake or mismatched packaging",
          ]);
          packagingScore =
            pkgResults.find(
              (r) => r.label === "authentic retail product packaging or branded box",
            )?.score ?? 0;
        }
      } catch (err) {
        throw new UpstreamError("CLIP verification inference failed.", {
          cause: err instanceof Error ? err.message : String(err),
        });
      }

      // Visual / model similarity vs the reference image (Product Passport).
      if (context.reference) {
        try {
          const extract = await getExtractor();
          const [a, b] = await Promise.all([
            extract(await rawImageFromInput(primary), { pooling: "mean", normalize: true }),
            extract(await rawImageFromInput(context.reference), {
              pooling: "mean",
              normalize: true,
            }),
          ]);
          visual = clamp01(cosine(a.data, b.data));
        } catch {
          visual = null;
        }
      }

      // Model identity tracks visual similarity to the reference; absent a
      // reference, fall back to the category signal.
      const modelScore = visual ?? categoryScore;

      // Weighted product-match confidence over the signals we actually have.
      const parts: Array<{ score: number; weight: number }> = [
        { score: categoryScore, weight: 0.25 },
        { score: brandScore, weight: brand ? 0.2 : 0.05 },
        { score: modelScore, weight: 0.15 },
        ...(visual != null ? [{ score: visual, weight: 0.4 }] : []),
        ...(packagingImg ? [{ score: packagingScore, weight: 0.1 }] : []),
      ];
      const wsum = parts.reduce((s, p) => s + p.weight, 0);
      const productMatchConfidence = clamp01(
        parts.reduce((s, p) => s + p.score * p.weight, 0) / (wsum || 1),
      );

      // Fraud rises as match falls; a strong visual deviation is a hard signal.
      let fraudRiskScore = clamp01(1 - productMatchConfidence);
      if (visual != null && visual < 0.5) {
        fraudRiskScore = clamp01(Math.max(fraudRiskScore, 0.6 + (0.5 - visual)));
      }

      const deviations: VerificationDeviation[] = [];
      const note = (
        attribute: string,
        detail: string,
        severity: VerificationDeviation["severity"],
      ) => deviations.push({ attribute, detail, severity });
      if (categoryScore < 0.45)
        note("category", `Item does not strongly read as ${category}.`, "severe");
      if (brand && brandScore < 0.4)
        note("brand", `Branding doesn't clearly match ${brand}.`, "moderate");
      if (visual != null && visual < 0.6)
        note(
          "visual",
          `Only ${Math.round(visual * 100)}% visual match to the reference product.`,
          visual < 0.45 ? "severe" : "moderate",
        );
      if (packagingImg && packagingScore < 0.4)
        note("packaging", "Packaging looks mismatched or unbranded.", "moderate");

      const refNote =
        visual != null ? ` ${Math.round(visual * 100)}% visual match to the catalog image.` : "";

      return VerifierOutputSchema.parse({
        productMatchConfidence: round(productMatchConfidence),
        fraudRiskScore: round(fraudRiskScore),
        attributes: {
          category: round(categoryScore),
          brand: round(brandScore),
          model: round(modelScore),
          packaging: round(packagingScore),
          visual: round(visual ?? modelScore),
        },
        deviations,
        summary:
          productMatchConfidence >= 0.7
            ? `Item appears to match the expected ${brand ? `${brand} ` : ""}${category}.${refNote}`
            : `Item may not match the expected ${brand ? `${brand} ` : ""}${category}.${refNote}`,
      });
    },
  };
}
