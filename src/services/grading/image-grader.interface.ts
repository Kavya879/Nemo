import { z } from "zod";
import { GradeSchema, DetectedFlawSchema, type ImageInput } from "@/types";

/**
 * The swappable grading contract.
 *
 * Everything in the grading service depends on THIS interface, never on a
 * concrete implementation. That is what lets us swap Bedrock for the local
 * model with a single config change (strategy pattern).
 */

/** The raw AI assessment — what a grader produces (timing/persistence added later). */
export const GraderOutputSchema = z.object({
  grade: GradeSchema,
  confidence: z.number().min(0).max(1),
  flaws: z.array(DetectedFlawSchema),
  summary: z.string().min(1),
});
export type GraderOutput = z.infer<typeof GraderOutputSchema>;

/** Optional context that helps graders reason (reference product image, etc.). */
export interface GradeContext {
  /** The item's category, e.g. "Footwear". */
  category?: string;
  /** The original/reference product image to compare the return photo against. */
  reference?: ImageInput;
}

export interface ImageGrader {
  /** Stable identifier stored on the GradeResult. */
  readonly name: "bedrock" | "local" | "clip" | "kaputt";
  /** Assess one or more product images and return a structured grade. */
  grade(images: ImageInput[], context?: GradeContext): Promise<GraderOutput>;
}
