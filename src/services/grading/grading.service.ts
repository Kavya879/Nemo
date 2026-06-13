import { env } from "@/config/env";
import { gradeRepository } from "@/repositories/grade.repository";
import { itemRepository } from "@/repositories/item.repository";
import { GradeResultSchema, type GradeResult, type ImageInput } from "@/types";
import type { Prisma } from "@prisma/client";
import { createBedrockGrader } from "./bedrock-grader";
import { createLocalGrader } from "./local-grader";
import type { GraderOutput, ImageGrader } from "./image-grader.interface";

/**
 * Grading service — orchestrates the Snap & Grade flow.
 *
 * Responsibilities:
 *  - pick the primary grader from config (env.GRADER_PROVIDER),
 *  - time the operation,
 *  - fall back to the local grader if the primary throws (resilience),
 *  - persist the GradeResult (when tied to an item) via the repository,
 *  - return a fully Zod-validated GradeResult.
 *
 * It depends only on the ImageGrader interface + repositories — never on a
 * concrete grader or on Prisma directly.
 */

export interface GradeRequest {
  images: ImageInput[];
  /** Optional — when present, the result is persisted and the item is updated. */
  itemId?: string;
}

export interface GradingDeps {
  primary: ImageGrader;
  fallback: ImageGrader;
}

/** Default wiring: provider chosen by config, local grader as the safety net. */
function defaultDeps(): GradingDeps {
  const local = createLocalGrader();
  const primary = env.GRADER_PROVIDER === "local" ? local : createBedrockGrader();
  return { primary, fallback: local };
}

export function createGradingService(deps: GradingDeps = defaultDeps()) {
  async function runGrader(
    grader: ImageGrader,
    images: ImageInput[],
  ): Promise<{ output: GraderOutput; gradedBy: ImageGrader["name"]; tookMs: number }> {
    const start = performance.now();
    const output = await grader.grade(images);
    const tookMs = Math.round(performance.now() - start);
    return { output, gradedBy: grader.name, tookMs };
  }

  return {
    async grade(req: GradeRequest): Promise<GradeResult> {
      let assessment: {
        output: GraderOutput;
        gradedBy: ImageGrader["name"];
        tookMs: number;
      };

      try {
        assessment = await runGrader(deps.primary, req.images);
      } catch (primaryErr) {
        // Resilience: primary (e.g. Bedrock) failed → fall back to local.
        if (deps.fallback.name === deps.primary.name) throw primaryErr;
        // eslint-disable-next-line no-console
        console.warn(
          `[grading] primary grader "${deps.primary.name}" failed, falling back to "${deps.fallback.name}".`,
          primaryErr instanceof Error ? primaryErr.message : primaryErr,
        );
        assessment = await runGrader(deps.fallback, req.images);
      }

      const result: GradeResult = GradeResultSchema.parse({
        ...assessment.output,
        gradedBy: assessment.gradedBy,
        tookMs: assessment.tookMs,
      });

      // Persist only when grading a known item.
      if (req.itemId) {
        await gradeRepository.create({
          grade: result.grade,
          confidence: result.confidence,
          flaws: result.flaws as unknown as Prisma.InputJsonValue,
          summary: result.summary,
          gradedBy: result.gradedBy,
          tookMs: result.tookMs,
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
