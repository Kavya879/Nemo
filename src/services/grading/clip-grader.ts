import { UpstreamError, ValidationError } from "@/lib/errors";
import type { DetectedFlaw, Grade, ImageInput } from "@/types";
import {
  cosine,
  getExtractor,
  getZeroShot,
  rawImageFromInput,
} from "@/services/vision/clip-pipeline";
import {
  GraderOutputSchema,
  type GradeContext,
  type GraderOutput,
  type ImageGrader,
} from "./image-grader.interface";

/**
 * CLIP grader — an open-source vision model (HuggingFace CLIP via Transformers.js)
 * that runs in-process on CPU, no external service.
 *
 * Two real signals drive the grade:
 *  1. Zero-shot condition classification — CLIP scores the return photo against
 *     condition prompts ("brand new flawless …" → "broken / badly damaged …"),
 *     which maps directly to grades A–D.
 *  2. Reference comparison (the Product Passport) — CLIP image embeddings of the
 *     return photo vs the original product image; low cosine similarity means the
 *     item deviates from how it shipped (extra wear / wrong item), which lowers
 *     the grade and raises a flaw.
 */

const GRADES_ORDER: Grade[] = ["A", "B", "C", "D"];

const CONDITION_PROMPTS = (category: string) => [
  `a brand new, flawless ${category} in pristine condition`,
  `a lightly used ${category} in good condition with minor wear`,
  `a used ${category} with visible scratches, stains or wear`,
  `a broken or badly damaged ${category}`,
];

export function createClipGrader(): ImageGrader {
  return {
    name: "clip",
    async grade(images: ImageInput[], context?: GradeContext): Promise<GraderOutput> {
      if (images.length === 0) {
        throw new ValidationError("CLIP grader received no images.");
      }
      const category = (context?.category ?? "product").toLowerCase();

      let grade: Grade;
      let conditionScore: number;
      let topLabelIdx: number;
      try {
        const classify = await getZeroShot();
        const raw = await rawImageFromInput(images[0]);
        const labels = CONDITION_PROMPTS(category);
        const results = await classify(raw, labels);
        // Map the winning prompt back to its grade by index.
        const top = results[0];
        topLabelIdx = Math.max(labels.indexOf(top.label), 0);
        grade = GRADES_ORDER[topLabelIdx] ?? "C";
        conditionScore = top.score;
      } catch (err) {
        throw new UpstreamError("CLIP inference failed.", {
          cause: err instanceof Error ? err.message : String(err),
        });
      }

      // Reference comparison (Product Passport) — optional.
      let similarity: number | null = null;
      if (context?.reference) {
        try {
          const extract = await getExtractor();
          const [a, b] = await Promise.all([
            extract(await rawImageFromInput(images[0]), { pooling: "mean", normalize: true }),
            extract(await rawImageFromInput(context.reference), { pooling: "mean", normalize: true }),
          ]);
          similarity = Number(cosine(a.data, b.data).toFixed(3));
        } catch {
          similarity = null; // reference unavailable → fall back to zero-shot only
        }
      }

      // A strong deviation from the reference nudges the grade down one step.
      const deviates = similarity != null && similarity < 0.6;
      if (deviates && grade !== "D") {
        grade = GRADES_ORDER[Math.min(GRADES_ORDER.indexOf(grade) + 1, 3)];
      }

      const flaws: DetectedFlaw[] = [];
      if (grade !== "A") {
        const severity = grade === "D" ? "severe" : grade === "C" ? "moderate" : "minor";
        flaws.push({
          type: topLabelIdx >= 3 ? "structural damage" : "surface wear/scratches",
          severity,
          location: "general",
        });
      }
      if (deviates) {
        flaws.push({
          type: "deviation from reference product",
          severity: "moderate",
          location: "overall appearance",
        });
      }

      const confidence = Number(
        Math.min(0.99, conditionScore * (similarity != null ? 0.85 + similarity * 0.15 : 1)).toFixed(3),
      );

      const refNote =
        similarity != null
          ? ` Reference match ${Math.round(similarity * 100)}%${deviates ? " — notable deviation from the original product" : ""}.`
          : "";

      return GraderOutputSchema.parse({
        grade,
        confidence,
        flaws,
        summary: `CLIP zero-shot condition: Grade ${grade}.${refNote}`,
      });
    },
  };
}
