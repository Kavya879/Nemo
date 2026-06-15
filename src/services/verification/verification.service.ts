import type { Prisma } from "@prisma/client";
import { env } from "@/config/env";
import { fetchImageAsInput } from "@/lib/remote-image";
import { configRepository } from "@/repositories/config.repository";
import { itemRepository } from "@/repositories/item.repository";
import { verificationRepository } from "@/repositories/verification.repository";
import {
  VerificationAssessmentSchema,
  type RoledImageInput,
  type VerificationAssessment,
  type VerificationRecommendationT,
} from "@/types";
import { createBedrockVerifier } from "./bedrock-verifier";
import type { ProductVerifier, VerifyContext } from "./product-verifier.interface";

/**
 * Verification service — orchestrates the pre-grade authentication gate.
 *
 * Responsibilities:
 *  - pick the primary verifier from config (Bedrock when selected, else CLIP),
 *  - load the item's metadata + catalog reference image as comparison context,
 *  - fall back to the in-process CLIP verifier if the primary throws (resilience),
 *  - apply the DB-configured thresholds to choose a recommendation
 *    (PROCEED | REQUEST_EVIDENCE | MANUAL_REVIEW) — never hardcoded,
 *  - persist a VerificationResult,
 *  - return a fully Zod-validated assessment.
 */

export interface VerifyRequest {
  images: RoledImageInput[];
  /** When present, the result is persisted and used to load reference context. */
  itemId?: string;
  /** Links the persisted result to a return case (for reviewer audit). */
  returnCaseId?: string;
}

export interface VerificationDeps {
  primary: ProductVerifier;
  fallback: ProductVerifier;
}

function defaultDeps(): VerificationDeps {
  // Lazy-load the CLIP verifier to prevent @xenova/transformers from being
  // bundled into server chunks at build time (causes prerender failures).
  let clipInstance: ProductVerifier | null = null;
  const lazyClip: ProductVerifier = {
    name: "clip" as const,
    async verify(images, context) {
      if (!clipInstance) {
        const { createClipVerifier } = await import("./clip-verifier");
        clipInstance = createClipVerifier();
      }
      return clipInstance.verify(images, context);
    },
  };
  const primary = env.GRADER_PROVIDER === "bedrock" ? createBedrockVerifier() : lazyClip;
  return { primary, fallback: lazyClip };
}

export function createVerificationService(deps: VerificationDeps = defaultDeps()) {
  async function run(
    verifier: ProductVerifier,
    images: RoledImageInput[],
    context: VerifyContext,
  ) {
    const start = performance.now();
    const output = await verifier.verify(images, context);
    return { output, verifiedBy: verifier.name, tookMs: Math.round(performance.now() - start) };
  }

  /**
   * Decide the gate outcome from the verifier output + the live config thresholds.
   * High fraud → escalate to a human; otherwise low match/quality → ask for more
   * evidence; only a confident, low-fraud match proceeds to grading.
   */
  function decide(
    productMatchConfidence: number,
    fraudRiskScore: number,
    thresholds: { matchThreshold: number; fraudThreshold: number },
  ): VerificationRecommendationT {
    if (fraudRiskScore >= thresholds.fraudThreshold) return "MANUAL_REVIEW";
    if (productMatchConfidence < thresholds.matchThreshold) return "REQUEST_EVIDENCE";
    return "PROCEED";
  }

  return {
    decide,

    async verify(req: VerifyRequest): Promise<VerificationAssessment> {
      // Build comparison context from the item (metadata + catalog reference).
      let context: VerifyContext = {};
      if (req.itemId) {
        const item = await itemRepository.findById(req.itemId);
        if (item) {
          context = {
            name: item.name,
            brand: item.brand,
            category: item.category,
            reference: item.imageUrl ? await fetchImageAsInput(item.imageUrl) : undefined,
          };
        }
      }

      let result: Awaited<ReturnType<typeof run>>;
      try {
        result = await run(deps.primary, req.images, context);
      } catch (primaryErr) {
        if (deps.fallback.name === deps.primary.name) throw primaryErr;
        // eslint-disable-next-line no-console
        console.warn(
          `[verification] primary verifier "${deps.primary.name}" failed, falling back to "${deps.fallback.name}".`,
          primaryErr instanceof Error ? primaryErr.message : primaryErr,
        );
        result = await run(deps.fallback, req.images, context);
      }

      const config = await configRepository.getRules();
      const recommendation = decide(
        result.output.productMatchConfidence,
        result.output.fraudRiskScore,
        {
          matchThreshold: config.verificationMatchThreshold,
          fraudThreshold: config.fraudRiskThreshold,
        },
      );

      const assessment: VerificationAssessment = VerificationAssessmentSchema.parse({
        ...result.output,
        recommendation,
        verifiedBy: result.verifiedBy,
        imageRoles: req.images.map((i) => i.role),
        tookMs: result.tookMs,
      });

      if (req.itemId) {
        await verificationRepository.create({
          productMatchConfidence: assessment.productMatchConfidence,
          fraudRiskScore: assessment.fraudRiskScore,
          attributes: assessment.attributes as unknown as Prisma.InputJsonValue,
          deviations: assessment.deviations as unknown as Prisma.InputJsonValue,
          recommendation: assessment.recommendation,
          verifiedBy: assessment.verifiedBy,
          imageRoles: assessment.imageRoles,
          summary: assessment.summary,
          tookMs: assessment.tookMs,
          ...(req.returnCaseId ? { returnCaseId: req.returnCaseId } : {}),
          item: { connect: { id: req.itemId } },
        });
      }

      return assessment;
    },
  };
}

/** Shared instance for the API + workflow layers. */
export const verificationService = createVerificationService();
