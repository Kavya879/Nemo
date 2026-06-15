import { env } from "@/config/env";
import { fetchImageAsInput } from "@/lib/remote-image";
import { gradeRepository } from "@/repositories/grade.repository";
import { itemRepository } from "@/repositories/item.repository";
import { GradeResultSchema, type GradeResult, type ImageInput } from "@/types";
import type { Prisma } from "@prisma/client";
import { createBedrockGrader } from "./bedrock-grader";
import { createLocalGrader } from "./local-grader";
import type { GradeContext, GraderOutput, ImageGrader } from "./image-grader.interface";

/**
 * Grading service — orchestrates the Snap & Grade flow.
 *
 * Responsibilities:
 *  - pick the primary grader from config (env.GRADER_PROVIDER: clip|bedrock|local),
 *  - load the item's reference product image + category and pass them as context
 *    so the model can compare the return photo to how the item shipped,
 *  - time the operation,
 *  - fall back to the sharp grader if the primary throws (resilience),
 *  - persist the GradeResult (when tied to an item),
 *  - return a fully Zod-validated GradeResult.
 */

export interface GradeRequest {
  images: ImageInput[];
  /** Optional — when present, the result is persisted and the item is updated. */
  itemId?: string;
  /**
   * Pre-grade verification scores to store alongside the grade so the full
   * assessment (match / quality / fraud / grade) lives together on one record.
   */
  verification?: { productMatchConfidence: number; fraudRiskScore: number };
}

export interface GradingDeps {
  primary: ImageGrader;
  fallback: ImageGrader;
}

/** Default wiring: provider chosen by config, sharp grader as the safety net. */
function defaultDeps(): GradingDeps {
  const local = createLocalGrader();
  let primary: ImageGrader;
  if (env.GRADER_PROVIDER === "bedrock") {
    primary = createBedrockGrader();
  } else if (env.GRADER_PROVIDER === "clip") {
    // Lazy-load clip grader to avoid bundling @xenova/transformers at build time.
    let clipInstance: ImageGrader | null = null;
    primary = {
      name: "clip" as const,
      async grade(images, context) {
        if (!clipInstance) {
          const { createClipGrader } = await import("./clip-grader");
          clipInstance = createClipGrader();
        }
        return clipInstance.grade(images, context);
      },
    };
  } else if (env.GRADER_PROVIDER === "kaputt") {
    // Lazy-load kaputt grader to avoid bundling onnxruntime-node at build time.
    // The actual module is loaded on first grade() call, not at import time.
    let kaputtInstance: ImageGrader | null = null;
    primary = {
      name: "kaputt" as const,
      async grade(images, context) {
        if (!kaputtInstance) {
          const { createKaputtGrader } = await import("./kaputt-grader");
          kaputtInstance = createKaputtGrader();
        }
        return kaputtInstance.grade(images, context);
      },
    };
  } else {
    primary = local;
  }
  return { primary, fallback: local };
}

export function createGradingService(deps: GradingDeps = defaultDeps()) {
  async function runGrader(
    grader: ImageGrader,
    images: ImageInput[],
    context?: GradeContext,
  ): Promise<{ output: GraderOutput; gradedBy: ImageGrader["name"]; tookMs: number }> {
    const start = performance.now();
    const output = await grader.grade(images, context);
    const tookMs = Math.round(performance.now() - start);
    return { output, gradedBy: grader.name, tookMs };
  }

  return {
    async grade(req: GradeRequest): Promise<GradeResult> {
      // Build grading context (category + reference product image) from the item.
      let context: GradeContext | undefined;
      if (req.itemId) {
        const item = await itemRepository.findById(req.itemId);
        if (item) {
          const reference = item.imageUrl ? await fetchImageAsInput(item.imageUrl) : undefined;
          context = { category: item.category, reference };
        }
      }

      let assessment: { output: GraderOutput; gradedBy: ImageGrader["name"]; tookMs: number };
      try {
        assessment = await runGrader(deps.primary, req.images, context);
      } catch (primaryErr) {
        if (deps.fallback.name === deps.primary.name) throw primaryErr;
        // eslint-disable-next-line no-console
        console.warn(
          `[grading] primary grader "${deps.primary.name}" failed, falling back to "${deps.fallback.name}".`,
          primaryErr instanceof Error ? primaryErr.message : primaryErr,
        );
        assessment = await runGrader(deps.fallback, req.images, context);
      }

      const result: GradeResult = GradeResultSchema.parse({
        ...assessment.output,
        gradedBy: assessment.gradedBy,
        tookMs: assessment.tookMs,
      });

      if (req.itemId) {
        await gradeRepository.create({
          grade: result.grade,
          confidence: result.confidence,
          flaws: result.flaws as unknown as Prisma.InputJsonValue,
          summary: result.summary,
          gradedBy: result.gradedBy,
          tookMs: result.tookMs,
          ...(req.verification
            ? {
                productMatchConfidence: req.verification.productMatchConfidence,
                fraudRiskScore: req.verification.fraudRiskScore,
              }
            : {}),
          item: { connect: { id: req.itemId } },
        });
        await itemRepository.updateGrade(req.itemId, result.grade);
      }

      return result;
    },
  };
}

/** Convenient shared instance for the API layer. */
export const gradingService = createGradingService();
