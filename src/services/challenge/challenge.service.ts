import type { Grade, Prisma } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  challengeRepository,
  type ChallengeWithRelations,
} from "@/repositories/challenge.repository";
import { returnCaseRepository } from "@/repositories/return-case.repository";
import { gradeRepository } from "@/repositories/grade.repository";
import { itemRepository } from "@/repositories/item.repository";
import { verificationRepository } from "@/repositories/verification.repository";
import { listingService } from "@/services/listing/listing.service";
import { returnWorkflowService } from "@/services/return-workflow/return-workflow.service";
import type { DetectedFlaw } from "@/types";

/** Verification-escalation kinds (distinct from grade disputes). */
export type VerificationKind = "RETURN_VERIFICATION" | "SELL_VERIFICATION";

/**
 * Challenge service — orchestrates the AI-verdict dispute lifecycle:
 *
 *   OPEN → UNDER_REVIEW ⇄ NEEDS_MORE_INFO → RESOLVED_{UPHELD|MODIFIED|OVERRIDDEN} | REJECTED
 *
 * A seller disputes the AI assessment of a graded return; the system snapshots
 * the original verdict + scores, files a review ticket routed to the Operations
 * Review team, and records every step as an append-only event so the seller can
 * follow progress and reasoning transparently. Reviewers can uphold, modify,
 * override, or request more information; a modify/override writes the revised
 * grade back onto the return case (and onto its trail).
 */

/** Where new tickets are routed by default. */
export const DEFAULT_REVIEW_QUEUE = "Operations Review Team";

const GRADABLE_STATES = new Set([
  "GRADED",
  "FEASIBILITY_ANALYZED",
  "RETURN_APPROVED",
  "RETURN_PICKUP_SCHEDULED",
  "RETURNED_TO_SELLER",
  "SECOND_LIFE_LISTED",
  "MANUAL_REVIEW",
]);

export interface EvidenceInput {
  data: string;
  mimeType?: string;
  role?: string;
  note?: string;
}

export function createChallengeService() {
  async function load(id: string): Promise<ChallengeWithRelations> {
    const c = await challengeRepository.findById(id);
    if (!c) throw new NotFoundError(`Challenge ${id} not found.`);
    return c;
  }

  return {
    get: load,
    list: (userId: string) => challengeRepository.listForUser(userId),
    listAll: () => challengeRepository.listAll(),

    /**
     * Seller opens a dispute on a graded return case. Snapshots the current AI
     * assessment, files the ticket, and routes it for review.
     */
    async open(input: {
      returnCaseId: string;
      reason: string;
      comment: string;
      userId: string;
      userName?: string;
      evidence?: EvidenceInput[];
    }): Promise<ChallengeWithRelations> {
      const rc = await returnCaseRepository.findById(input.returnCaseId);
      if (!rc) throw new NotFoundError(`Return case ${input.returnCaseId} not found.`);
      if (!GRADABLE_STATES.has(rc.status) || rc.grade == null) {
        throw new ConflictError(
          "This return has no AI verdict to dispute yet — it must be graded first.",
        );
      }
      const existing = await challengeRepository.findOpenForCase(rc.id);
      if (existing) {
        throw new ConflictError("There is already an open challenge for this return.");
      }
      if (!input.comment.trim()) {
        throw new ValidationError("Please explain why you're disputing the AI assessment.");
      }

      // Snapshot the full AI assessment as it stands now (immutable record).
      const [grade, verification] = await Promise.all([
        gradeRepository.findLatestForItem(rc.itemId),
        verificationRepository.findLatestForItem(rc.itemId),
      ]);
      const snapshot = {
        grade: rc.grade,
        gradeConfidence: rc.gradeConfidence,
        productMatchConfidence: rc.productMatchConfidence,
        fraudRiskScore: rc.fraudRiskScore,
        flaws: grade?.flaws ?? [],
        gradeSummary: grade?.summary ?? null,
        gradedBy: grade?.gradedBy ?? null,
        verification: verification
          ? {
              productMatchConfidence: verification.productMatchConfidence,
              fraudRiskScore: verification.fraudRiskScore,
              attributes: verification.attributes,
              deviations: verification.deviations,
              recommendation: verification.recommendation,
              verifiedBy: verification.verifiedBy,
            }
          : null,
        capturedAt: rc.updatedAt.toISOString(),
      };

      const evidence = (input.evidence ?? []).map((e) => ({
        data: e.data,
        mimeType: e.mimeType ?? "image/jpeg",
        role: e.role ?? "other",
        note: e.note ?? null,
        addedBy: "seller",
      }));

      const created = await challengeRepository.create(
        {
          returnCase: { connect: { id: rc.id } },
          item: { connect: { id: rc.itemId } },
          kind: "GRADE_DISPUTE",
          openedByUserId: input.userId,
          openedByName: input.userName ?? null,
          status: "OPEN",
          reason: input.reason,
          sellerComment: input.comment.trim(),
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          assignedTo: DEFAULT_REVIEW_QUEUE,
        },
        evidence,
      );

      return challengeRepository.transition(created.id, {
        status: "OPEN",
        actor: "seller",
        message: `Challenge filed against AI Grade ${rc.grade}. Routed to ${DEFAULT_REVIEW_QUEUE}. Reason: "${input.reason}". ${evidence.length} evidence file(s) attached.`,
        data: { reason: input.reason, evidenceCount: evidence.length } as Prisma.InputJsonValue,
      });
    },

    /** Seller (or reviewer) attaches more evidence; re-activates a NEEDS_MORE_INFO ticket. */
    async addEvidence(input: {
      challengeId: string;
      actor: string;
      comment?: string;
      evidence: EvidenceInput[];
      bySeller?: boolean;
    }): Promise<ChallengeWithRelations> {
      const c = await load(input.challengeId);
      if (c.status.startsWith("RESOLVED") || c.status === "REJECTED") {
        throw new ConflictError("This challenge is already resolved.");
      }
      if (!input.evidence.length && !input.comment?.trim()) {
        throw new ValidationError("Provide a comment or at least one evidence file.");
      }
      await challengeRepository.addEvidence(
        c.id,
        input.evidence.map((e) => ({
          data: e.data,
          mimeType: e.mimeType ?? "image/jpeg",
          role: e.role ?? "other",
          note: e.note ?? null,
          addedBy: input.bySeller ? "seller" : input.actor,
        })),
      );
      // New seller evidence on a NEEDS_MORE_INFO ticket moves it back into review.
      const nextStatus = c.status === "NEEDS_MORE_INFO" ? "UNDER_REVIEW" : c.status;
      return challengeRepository.transition(c.id, {
        status: nextStatus,
        actor: input.actor,
        message:
          `${input.evidence.length} additional evidence file(s) added` +
          (input.comment?.trim() ? `: "${input.comment.trim()}"` : "."),
        data: { evidenceCount: input.evidence.length } as Prisma.InputJsonValue,
      });
    },

    /** Reviewer picks up the ticket. */
    async assign(input: {
      challengeId: string;
      reviewer: string;
    }): Promise<ChallengeWithRelations> {
      const c = await load(input.challengeId);
      if (c.status.startsWith("RESOLVED") || c.status === "REJECTED") {
        throw new ConflictError("This challenge is already resolved.");
      }
      return challengeRepository.transition(c.id, {
        status: "UNDER_REVIEW",
        actor: input.reviewer,
        message: `Picked up for review by ${input.reviewer}.`,
        patch: { assignedTo: input.reviewer },
      });
    },

    /** Reviewer asks the seller for more information. */
    async requestInfo(input: {
      challengeId: string;
      reviewer: string;
      message: string;
    }): Promise<ChallengeWithRelations> {
      const c = await load(input.challengeId);
      if (c.status.startsWith("RESOLVED") || c.status === "REJECTED") {
        throw new ConflictError("This challenge is already resolved.");
      }
      if (!input.message.trim()) {
        throw new ValidationError("Describe what additional information is needed.");
      }
      return challengeRepository.transition(c.id, {
        status: "NEEDS_MORE_INFO",
        actor: input.reviewer,
        message: `More information requested: ${input.message.trim()}`,
      });
    },

    /**
     * Reviewer resolves the dispute. MODIFY/OVERRIDE write the revised grade
     * back onto the return case and append to its trail.
     */
    async resolve(input: {
      challengeId: string;
      reviewer: string;
      action: "UPHOLD" | "MODIFY" | "OVERRIDE" | "REJECT";
      revisedGrade?: Grade;
      reasoning: string;
    }): Promise<ChallengeWithRelations> {
      const c = await load(input.challengeId);
      if (c.status.startsWith("RESOLVED") || c.status === "REJECTED") {
        throw new ConflictError("This challenge is already resolved.");
      }
      if (!input.reasoning.trim()) {
        throw new ValidationError("A resolution reasoning is required for the audit trail.");
      }
      const changesGrade = input.action === "MODIFY" || input.action === "OVERRIDE";
      if (changesGrade && !input.revisedGrade) {
        throw new ValidationError(`A revised grade is required to ${input.action.toLowerCase()}.`);
      }

      const statusMap = {
        UPHOLD: "RESOLVED_UPHELD",
        MODIFY: "RESOLVED_MODIFIED",
        OVERRIDE: "RESOLVED_OVERRIDDEN",
        REJECT: "REJECTED",
      } as const;

      // Write the revised grade back onto the return case + its audit trail.
      if (changesGrade && input.revisedGrade && c.returnCaseId) {
        const rc = await returnCaseRepository.findById(c.returnCaseId);
        if (rc) {
          await returnCaseRepository.transition(rc.id, {
            status: rc.status, // grade revision doesn't move the workflow state
            message: `Grade ${input.action === "OVERRIDE" ? "overridden" : "modified"} ${
              rc.grade ?? "?"
            } → ${input.revisedGrade} by ${input.reviewer} (challenge ${c.id.slice(-6)}). ${input.reasoning.trim()}`,
            patch: { grade: input.revisedGrade },
            data: {
              challengeId: c.id,
              from: rc.grade,
              to: input.revisedGrade,
              by: input.reviewer,
            } as Prisma.InputJsonValue,
          });
        }
      }

      return challengeRepository.transition(c.id, {
        status: statusMap[input.action],
        actor: input.reviewer,
        message:
          input.action === "UPHOLD"
            ? `AI verdict upheld by ${input.reviewer}. ${input.reasoning.trim()}`
            : input.action === "REJECT"
              ? `Challenge rejected by ${input.reviewer} — AI verdict stands. ${input.reasoning.trim()}`
              : `Grade ${input.action === "OVERRIDE" ? "overridden" : "modified"} to ${input.revisedGrade} by ${input.reviewer}. ${input.reasoning.trim()}`,
        patch: {
          resolution: input.action,
          revisedGrade: input.revisedGrade ?? null,
          resolutionReasoning: input.reasoning.trim(),
          resolvedByName: input.reviewer,
          resolvedAt: new Date(),
        },
        data: { action: input.action, revisedGrade: input.revisedGrade } as Prisma.InputJsonValue,
      });
    },

    /**
     * Open a VERIFICATION escalation — used when the AI verification gate keeps
     * failing (return flow) or flags fraud on a genuine item (Sell flow) after
     * repeated tries. Unlike a grade dispute, there may be no return case (Sell
     * flow) and no grade is required; the reviewer simply accepts or rejects.
     */
    async openVerification(input: {
      itemId: string;
      returnCaseId?: string | null;
      kind: VerificationKind;
      reason: string;
      comment: string;
      userId: string;
      userName?: string;
      evidence?: EvidenceInput[];
      /** Sell flow: the seller's intended listing price (used to list on accept). */
      intendedPrice?: number;
      intendedPricePct?: number;
    }): Promise<ChallengeWithRelations> {
      const item = await itemRepository.findById(input.itemId);
      if (!item) throw new NotFoundError(`Item ${input.itemId} not found.`);
      const existing = await challengeRepository.findOpenVerificationForItem(input.itemId);
      if (existing) {
        throw new ConflictError("There's already an open verification request for this item.");
      }
      if (!input.comment.trim()) {
        throw new ValidationError("Please add a note for the reviewer.");
      }

      const [grade, verification] = await Promise.all([
        gradeRepository.findLatestForItem(input.itemId),
        verificationRepository.findLatestForItem(input.itemId),
      ]);
      const snapshot = {
        grade: grade?.grade ?? null,
        gradeConfidence: grade?.confidence ?? null,
        productMatchConfidence: verification?.productMatchConfidence ?? null,
        fraudRiskScore: verification?.fraudRiskScore ?? null,
        flaws: grade?.flaws ?? [],
        gradeSummary: grade?.summary ?? null,
        gradedBy: grade?.gradedBy ?? null,
        verification: verification
          ? {
              productMatchConfidence: verification.productMatchConfidence,
              fraudRiskScore: verification.fraudRiskScore,
              attributes: verification.attributes,
              deviations: verification.deviations,
              recommendation: verification.recommendation,
              verifiedBy: verification.verifiedBy,
            }
          : null,
        intendedPrice: input.intendedPrice ?? null,
        intendedPricePct: input.intendedPricePct ?? null,
        capturedAt: new Date().toISOString(),
      };

      const evidence = (input.evidence ?? []).map((e) => ({
        data: e.data,
        mimeType: e.mimeType ?? "image/jpeg",
        role: e.role ?? "other",
        note: e.note ?? null,
        addedBy: "seller",
      }));

      const created = await challengeRepository.create(
        {
          ...(input.returnCaseId ? { returnCase: { connect: { id: input.returnCaseId } } } : {}),
          item: { connect: { id: input.itemId } },
          kind: input.kind,
          openedByUserId: input.userId,
          openedByName: input.userName ?? null,
          status: "OPEN",
          reason: input.reason,
          sellerComment: input.comment.trim(),
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          assignedTo: DEFAULT_REVIEW_QUEUE,
        },
        evidence,
      );

      const label = input.kind === "SELL_VERIFICATION" ? "Sell listing" : "Return";
      return challengeRepository.transition(created.id, {
        status: "OPEN",
        actor: "seller",
        message: `${label} verification requested after repeated AI gate failures. Routed to ${DEFAULT_REVIEW_QUEUE}. Reason: "${input.reason}". ${evidence.length} evidence file(s).`,
        data: { kind: input.kind } as Prisma.InputJsonValue,
      });
    },

    /**
     * Reviewer ACCEPTS (item is genuine) or REJECTS a verification escalation.
     * ACCEPT proceeds the underlying flow (return → grade + analyze; sell → list
     * the product); REJECT denies it. This is the accept/reject the ops team uses.
     */
    async decideVerification(input: {
      challengeId: string;
      reviewer: string;
      decision: "ACCEPT" | "REJECT";
      reasoning: string;
    }): Promise<ChallengeWithRelations> {
      const c = await load(input.challengeId);
      if (c.status.startsWith("RESOLVED") || c.status === "REJECTED") {
        throw new ConflictError("This request is already resolved.");
      }
      if (c.kind === "GRADE_DISPUTE") {
        throw new ValidationError("Grade disputes are adjudicated via resolve, not accept/reject.");
      }
      if (!input.reasoning.trim()) {
        throw new ValidationError("A decision reasoning is required for the audit trail.");
      }

      if (input.decision === "ACCEPT") {
        if (c.kind === "RETURN_VERIFICATION" && c.returnCaseId) {
          await returnWorkflowService.adminApproveVerification({
            caseId: c.returnCaseId,
            reviewer: input.reviewer,
          });
        } else if (c.kind === "SELL_VERIFICATION") {
          const snap = c.snapshot as Record<string, unknown>;
          const grade = (snap.grade as Grade | null) ?? null;
          const price = typeof snap.intendedPrice === "number" ? snap.intendedPrice : null;
          const pricePct = typeof snap.intendedPricePct === "number" ? snap.intendedPricePct : null;
          if (!grade) throw new ConflictError("No AI grade on file — cannot list this item.");
          if (price == null || pricePct == null) {
            throw new ConflictError("No intended price was captured for this listing.");
          }
          await listingService.create({
            itemId: c.itemId,
            grade,
            confidence: typeof snap.gradeConfidence === "number" ? snap.gradeConfidence : 0.5,
            flaws: (snap.flaws as DetectedFlaw[] | undefined) ?? [],
            price,
            pricePct,
            history: [
              "Listed by seller on Amazon Nemo",
              `Verified by Amazon Nemo Operations (${input.reviewer})`,
            ],
          });
        }
        return challengeRepository.transition(c.id, {
          status: "RESOLVED_OVERRIDDEN",
          actor: input.reviewer,
          message: `Verification ACCEPTED by ${input.reviewer} — item confirmed genuine. ${input.reasoning.trim()}`,
          patch: {
            resolution: "OVERRIDE",
            resolutionReasoning: input.reasoning.trim(),
            resolvedByName: input.reviewer,
            resolvedAt: new Date(),
          },
          data: { decision: "ACCEPT" } as Prisma.InputJsonValue,
        });
      }

      // REJECT
      if (c.kind === "RETURN_VERIFICATION" && c.returnCaseId) {
        await returnWorkflowService.adminRejectVerification({
          caseId: c.returnCaseId,
          reason: input.reasoning.trim(),
          reviewer: input.reviewer,
        });
      }
      return challengeRepository.transition(c.id, {
        status: "REJECTED",
        actor: input.reviewer,
        message: `Verification REJECTED by ${input.reviewer} — could not confirm the item. ${input.reasoning.trim()}`,
        patch: {
          resolution: "REJECT",
          resolutionReasoning: input.reasoning.trim(),
          resolvedByName: input.reviewer,
          resolvedAt: new Date(),
        },
        data: { decision: "REJECT" } as Prisma.InputJsonValue,
      });
    },
  };
}

export const challengeService = createChallengeService();
