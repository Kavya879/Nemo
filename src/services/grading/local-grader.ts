import { env } from "@/config/env";
import { LOCAL_GRADER_GRADE_CUTOFFS } from "@/config/constants";
import { ValidationError } from "@/lib/errors";
import type { Grade, ImageInput } from "@/types";
import {
  GraderOutputSchema,
  type GraderOutput,
  type ImageGrader,
} from "./image-grader.interface";

/**
 * Offline fallback grader (Transformers.js + a pre-trained image classifier).
 *
 * A generic image classifier recognizes the object, not its damage, so this
 * fallback maps the classifier's top-1 confidence onto a condition grade using
 * configurable cutoffs (a clear, confidently-recognized photo ⇒ better grade).
 * It is a resilience layer, not a replacement for true vision grading — but it
 * always returns the same validated shape with zero external dependencies.
 */

export interface Classification {
  label: string;
  score: number;
}
export type ClassifyFn = (image: ImageInput) => Promise<Classification[]>;

/** Maps a top-1 confidence to a grade via config-driven cutoffs. */
function confidenceToGrade(score: number): Grade {
  for (const cut of LOCAL_GRADER_GRADE_CUTOFFS) {
    if (score >= cut.min) return cut.grade;
  }
  return "D";
}

/** Default classifier: lazily loads Transformers.js and caches the pipeline. */
function createTransformersClassifier(): ClassifyFn {
  let pipelinePromise: Promise<unknown> | null = null;

  return async (image: ImageInput): Promise<Classification[]> => {
    // Transformers.js in Node can't read a `data:` URL string — it must receive
    // a RawImage. Decode the base64 into a Blob and build one.
    const { pipeline, RawImage } = await import("@xenova/transformers");
    if (!pipelinePromise) {
      pipelinePromise = pipeline("image-classification", env.LOCAL_GRADER_MODEL);
    }
    const classifier = (await pipelinePromise) as (
      input: unknown,
      opts?: { topk?: number },
    ) => Promise<Classification[]>;

    const bytes = Buffer.from(image.base64, "base64");
    const blob = new Blob([bytes], { type: image.mimeType });
    const raw = await RawImage.fromBlob(blob);
    return classifier(raw, { topk: 3 });
  };
}

export function createLocalGrader(opts?: { classify?: ClassifyFn }): ImageGrader {
  const classify = opts?.classify ?? createTransformersClassifier();

  return {
    name: "local",
    async grade(images: ImageInput[]): Promise<GraderOutput> {
      if (images.length === 0) {
        throw new ValidationError("Local grader received no images.");
      }
      const first = images[0];
      const results = await classify(first);
      const top = results[0] ?? { label: "unknown", score: 0.4 };
      const grade = confidenceToGrade(top.score);

      const output: GraderOutput = {
        grade,
        confidence: Number(top.score.toFixed(3)),
        flaws:
          grade === "A"
            ? []
            : [
                {
                  type: "wear",
                  severity: grade === "D" ? "severe" : "moderate",
                  location: "general",
                },
              ],
        summary: `Offline assessment: recognized as "${top.label}", graded ${grade}.`,
      };

      // Validate our own output too — the contract is enforced everywhere.
      return GraderOutputSchema.parse(output);
    },
  };
}
