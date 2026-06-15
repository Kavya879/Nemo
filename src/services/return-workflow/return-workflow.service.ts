import type { Disposition, Prisma, ReturnStatus } from "@prisma/client";
import { CUSTOMER_LOCATION } from "@/config/constants";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  returnCaseRepository,
  type ReturnCaseWithRelations,
} from "@/repositories/return-case.repository";
import { itemRepository } from "@/repositories/item.repository";
import { orderRepository } from "@/repositories/order.repository";
import { gradeRepository } from "@/repositories/grade.repository";
import { listingRepository } from "@/repositories/listing.repository";
import { configRepository } from "@/repositories/config.repository";
import { verificationRepository } from "@/repositories/verification.repository";
import { gradingService } from "@/services/grading/grading.service";
import { verificationService } from "@/services/verification/verification.service";
import { feasibilityService } from "@/services/feasibility/feasibility.service";
import { pricingService } from "@/services/pricing/pricing.service";
import { listingService } from "@/services/listing/listing.service";
import { matchingService } from "@/services/matching/matching.service";
import { routingService } from "@/services/routing/routing.service";
import { creditsService } from "@/services/credits/credits.service";
import { ordersService } from "@/services/orders/orders.service";
import type { RoledImageInput, RoutingPath } from "@/types";

/**
 * Return-workflow orchestrator — the brain that runs the entire return decision
 * lifecycle as a persisted, traceable state machine:
 *
 *   INITIATED → GRADED → FEASIBILITY_ANALYZED
 *     ├─ FEASIBLE → RETURN_APPROVED → RETURN_PICKUP_SCHEDULED → RETURNED_TO_SELLER
 *     └─ NOT_FEASIBLE → SECOND_LIFE_LISTED ──(buyer found)──→ BUYER_RESERVED →
 *           SL_PICKUP_SCHEDULED → DELIVERY_VERIFICATION
 *              ├─ approved → TRANSFER_APPROVED → REFUND_INITIATED → COMPLETED
 *              └─ rejected → TRANSFER_REJECTED
 *        ──(no buyer in window)──→ WINDOW_EXPIRED → LIQUIDATION_PICKUP → LIQUIDATED
 *
 * Each method advances the machine, persists the new state, and appends an
 * audit event. Decisions come only from the grading / feasibility / routing /
 * matching engines — never hardcoded.
 */

function assertStatus(
  current: ReturnStatus,
  allowed: ReturnStatus[],
  action: string,
): void {
  if (!allowed.includes(current)) {
    throw new ConflictError(
      `Cannot ${action}: case is in state ${current} (expected ${allowed.join(" or ")}).`,
    );
  }
}

const PATH_TO_DISPOSITION: Record<RoutingPath, Disposition> = {
  RESELL_AS_IS: "BULK_RESALE",
  REFURBISH: "REFURBISHMENT",
  PEER_TO_PEER: "BULK_RESALE",
  DONATE: "DONATED",
  RECYCLE: "RECYCLED",
};

const DISPOSITION_TO_ITEM_STATUS: Record<
  Disposition,
  "SOLD" | "DONATED" | "RECYCLED" | "ROUTED"
> = {
  LIQUIDATED: "ROUTED",
  BULK_RESALE: "ROUTED",
  REFURBISHMENT: "ROUTED",
  DONATED: "DONATED",
  RECYCLED: "RECYCLED",
};

export function createReturnWorkflowService() {
  async function load(caseId: string): Promise<ReturnCaseWithRelations> {
    const c = await returnCaseRepository.findById(caseId);
    if (!c) throw new NotFoundError(`Return case ${caseId} not found.`);
    return c;
  }

  return {
    get(caseId: string) {
      return load(caseId);
    },

    list(userId = "demo-user") {
      return returnCaseRepository.listForUser(userId);
    },

    /** 1. Customer initiates a return — gated by the order return window. */
    async initiate(input: {
      itemId: string;
      reason: string;
      userId?: string;
      pickupLat?: number;
      pickupLng?: number;
    }): Promise<ReturnCaseWithRelations> {
      const userId = input.userId ?? "demo-user";
      const item = await itemRepository.findById(input.itemId);
      if (!item) throw new NotFoundError(`Item ${input.itemId} not found.`);

      const eligibility = await ordersService.checkReturnEligibility(input.itemId, userId);
      if (!eligibility.eligible) {
        throw new ConflictError(eligibility.reason ?? "Item is not eligible for return.");
      }

      const hasPickup =
        typeof input.pickupLat === "number" && typeof input.pickupLng === "number";
      const created = await returnCaseRepository.create({
        userId,
        reason: input.reason,
        orderId: eligibility.orderId,
        status: "INITIATED",
        ...(hasPickup ? { pickupLat: input.pickupLat, pickupLng: input.pickupLng } : {}),
        item: { connect: { id: input.itemId } },
      });

      if (eligibility.orderId) {
        await orderRepository.updateStatus(eligibility.orderId, "RETURN_REQUESTED");
      }

      return returnCaseRepository.transition(created.id, {
        status: "INITIATED",
        message: `Return request initiated by customer. Reason: "${input.reason}".`,
      });
    },

    /**
     * 2. Pre-grade verification gate, then grading.
     *
     * First confirms the uploaded item matches the originally purchased product
     * (category/brand/model/packaging/visual) and screens for fraud. Only a
     * confident, low-fraud match proceeds to condition grading; otherwise the
     * case is parked for more evidence or escalated to manual review — no grade
     * is assigned. Runs from INITIATED or EVIDENCE_REQUESTED (re-submission).
     */
    async grade(input: {
      caseId: string;
      images: RoledImageInput[];
    }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["INITIATED", "EVIDENCE_REQUESTED"], "grade");

      const config = await configRepository.getRules();

      // ── Verification gate ──────────────────────────────────────────────
      const verification = await verificationService.verify({
        images: input.images,
        itemId: c.itemId,
        returnCaseId: c.id,
      });
      const verRecord = await verificationRepository.findLatestForItem(c.itemId);
      const scorePct = (n: number) => Math.round(n * 100);
      // Persist the submitted photos on the case so the admin and the pickup
      // partner can view them and compare against the original product.
      const returnPhotos = input.images.map((i) => ({
        data: i.base64,
        mimeType: i.mimeType,
        role: i.role,
      })) as unknown as Prisma.InputJsonValue;
      const verPatch = {
        verificationResultId: verRecord?.id ?? null,
        productMatchConfidence: verification.productMatchConfidence,
        fraudRiskScore: verification.fraudRiskScore,
        returnPhotos,
      };
      const verData = {
        verification: {
          productMatchConfidence: verification.productMatchConfidence,
          fraudRiskScore: verification.fraudRiskScore,
          attributes: verification.attributes,
          deviations: verification.deviations,
          recommendation: verification.recommendation,
          verifiedBy: verification.verifiedBy,
          imageRoles: verification.imageRoles,
          tookMs: verification.tookMs,
        },
      } as unknown as Prisma.InputJsonValue;

      // Each non-PROCEED outcome counts as a failed verification attempt — after
      // a few, the UI offers to escalate to admin (human) verification.
      const failPatch = { ...verPatch, verificationAttempts: { increment: 1 } };

      if (verification.recommendation === "MANUAL_REVIEW") {
        return returnCaseRepository.transition(c.id, {
          status: "MANUAL_REVIEW",
          message: `Verification escalated to manual review — fraud risk ${scorePct(
            verification.fraudRiskScore,
          )}% (threshold ${scorePct(config.fraudRiskThreshold)}%), product match ${scorePct(
            verification.productMatchConfidence,
          )}%. ${verification.summary}`,
          data: verData,
          patch: failPatch,
        });
      }

      if (verification.recommendation === "REQUEST_EVIDENCE") {
        return returnCaseRepository.transition(c.id, {
          status: "EVIDENCE_REQUESTED",
          message: `More evidence needed before grading — product match ${scorePct(
            verification.productMatchConfidence,
          )}% is below the ${scorePct(
            config.verificationMatchThreshold,
          )}% threshold. Please upload clearer front, back, side and packaging photos.`,
          data: verData,
          patch: failPatch,
        });
      }

      // ── Verified → condition grading ───────────────────────────────────
      const result = await gradingService.grade({
        images: input.images,
        itemId: c.itemId,
        verification: {
          productMatchConfidence: verification.productMatchConfidence,
          fraudRiskScore: verification.fraudRiskScore,
        },
      });
      const latest = await gradeRepository.findLatestForItem(c.itemId);

      // Low quality-assessment confidence → escalate instead of assigning a grade.
      if (result.confidence < config.minQualityConfidence) {
        return returnCaseRepository.transition(c.id, {
          status: "MANUAL_REVIEW",
          message: `Verified (match ${scorePct(
            verification.productMatchConfidence,
          )}%), but quality-assessment confidence ${scorePct(
            result.confidence,
          )}% is below the ${scorePct(
            config.minQualityConfidence,
          )}% threshold — escalated for manual review before a grade is assigned.`,
          data: {
            ...(verData as object),
            grade: result.grade,
            confidence: result.confidence,
          } as unknown as Prisma.InputJsonValue,
          patch: { ...failPatch, gradeResultId: latest?.id ?? null },
        });
      }

      return returnCaseRepository.transition(c.id, {
        status: "GRADED",
        message: `Verified & graded: product match ${scorePct(
          verification.productMatchConfidence,
        )}%, fraud risk ${scorePct(verification.fraudRiskScore)}%. Grade ${result.grade} (${scorePct(
          result.confidence,
        )}% quality confidence, ${result.gradedBy}, ${result.tookMs}ms). ${result.summary}`,
        data: {
          ...(verData as object),
          grade: result.grade,
          confidence: result.confidence,
          flaws: result.flaws,
        } as unknown as Prisma.InputJsonValue,
        patch: {
          ...verPatch,
          grade: result.grade,
          gradeConfidence: result.confidence,
          gradeResultId: latest?.id ?? null,
        },
      });
    },

    /** 3. Feasibility Analysis Engine → decision → branch. */
    async analyze(input: { caseId: string }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["GRADED"], "analyze");
      if (!c.grade) throw new ConflictError("Case has no grade to analyze.");

      // Pickup origin drives BOTH warehouse-proximity routing and nearby matching:
      // close to an FC ⇒ normal return, far ⇒ list for nearby buyers. Use the
      // case's captured pickup location, falling back to the demo center.
      const origin =
        c.pickupLat != null && c.pickupLng != null
          ? { lat: c.pickupLat, lng: c.pickupLng }
          : CUSTOMER_LOCATION;

      // Nearby demand near the customer (feeds resale pricing + later buyer search).
      const nearby = await matchingService.findNearby({
        category: c.item.category,
        origin,
      });

      const feasibility = await feasibilityService.analyze({
        grade: c.grade,
        originalPrice: c.item.originalPrice,
        category: c.item.category,
        customerLocation: origin,
        demandCount: nearby.length,
      });

      // Persist the analysis + decision.
      await returnCaseRepository.transition(c.id, {
        status: "FEASIBILITY_ANALYZED",
        message: feasibility.reasoning,
        data: feasibility as unknown as Prisma.InputJsonValue,
        patch: {
          feasibility: feasibility as unknown as Prisma.InputJsonValue,
          decision: feasibility.decision,
        },
      });

      if (feasibility.decision === "FEASIBLE") {
        await returnCaseRepository.transition(c.id, {
          status: "RETURN_APPROVED",
          message: `Return APPROVED — net recovery ₹${feasibility.netRecoveryValue} justifies processing.`,
        });
        return returnCaseRepository.transition(c.id, {
          status: "RETURN_PICKUP_SCHEDULED",
          message:
            "Pickup scheduled via delivery partner. Item will be routed back to the seller/refurbishment center.",
        });
      }

      // NOT FEASIBLE → open the Second Life opportunity window.
      const config = await configRepository.getRules();
      const pricing = await pricingService.price({
        grade: c.grade,
        originalPrice: c.item.originalPrice,
        category: c.item.category,
        demandCount: nearby.length,
      });
      const latestGrade = await gradeRepository.findLatestForItem(c.itemId);
      const listing = await listingService.create({
        itemId: c.itemId,
        grade: c.grade,
        confidence: latestGrade?.confidence ?? 0.9,
        flaws: (latestGrade?.flaws as unknown as
          | { type: string; severity: "minor" | "moderate" | "severe"; location: string }[]
          | null) ?? [],
        price: pricing.price,
        pricePct: pricing.pricePct,
        history: [`Returned: ${c.reason}`, "Return uneconomical — entered Second Life window"],
      });

      const deadline = new Date(Date.now() + config.secondLifeWindowDays * 86_400_000);

      return returnCaseRepository.transition(c.id, {
        status: "SECOND_LIFE_LISTED",
        message: `Return uneconomical. Auto-listed in the Second Life marketplace at ₹${pricing.price} for a ${config.secondLifeWindowDays}-day opportunity window.`,
        data: { listingId: listing.id, price: pricing.price, deadline: deadline.toISOString() },
        patch: {
          secondLifeListingId: listing.id,
          secondLifeDeadline: deadline,
        },
      });
    },

    /**
     * Feasible path: delivery partner inspects the item at pickup and REJECTS it
     * (doesn't match the original / damaged differently / fraud). Because this is
     * a second-hand item, the rejection is escalated to an admin who decides
     * whether to KEEP it in the store inventory or REMOVE it completely — see
     * `resolveDeliveryRejection`. The case parks in DELIVERY_REJECTED_REVIEW.
     */
    async rejectReturnPickup(input: { caseId: string; reason: string }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["RETURN_PICKUP_SCHEDULED"], "reject pickup");
      const reason = input.reason.trim() || "Item did not match the original product at pickup.";
      return returnCaseRepository.transition(c.id, {
        status: "DELIVERY_REJECTED_REVIEW",
        message: `Pickup REJECTED by the delivery partner: ${reason}. Escalated for manual review — an admin will decide whether to keep the item in inventory or remove it from the store.`,
        patch: { verificationApproved: false, rejectionReason: reason },
      });
    },

    /** Feasible path: delivery partner has collected the item. */
    async completeReturnPickup(input: { caseId: string }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["RETURN_PICKUP_SCHEDULED"], "complete pickup");
      await itemRepository.updateStatus(c.itemId, "ROUTED");
      if (c.orderId) await orderRepository.updateStatus(c.orderId, "RETURNED");
      return returnCaseRepository.transition(c.id, {
        status: "RETURNED_TO_SELLER",
        message: "Item collected and returned to the seller/refurbishment center. Return complete.",
      });
    },

    /**
     * Second Life: continuously search for nearby buyers, prioritizing those
     * closest to the customer/seller to minimize logistics. Reserves the nearest.
     */
    async findBuyer(input: {
      caseId: string;
    }): Promise<{ case: ReturnCaseWithRelations; found: boolean }> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["SECOND_LIFE_LISTED"], "search for buyers");
      if (c.secondLifeDeadline && Date.now() > new Date(c.secondLifeDeadline).getTime()) {
        throw new ConflictError("Second Life window has expired; run liquidation instead.");
      }

      const origin =
        c.pickupLat != null && c.pickupLng != null
          ? { lat: c.pickupLat, lng: c.pickupLng }
          : CUSTOMER_LOCATION;
      const matches = await matchingService.findNearby({
        category: c.item.category,
        origin,
      });
      if (matches.length === 0) {
        return { case: c, found: false };
      }

      const buyer = matches[0]; // nearest = lowest logistics cost
      // Buyer identity is stored on the case for the DELIVERY PARTNER only; it is
      // never surfaced to the reseller. The audit message stays generic.
      await returnCaseRepository.transition(c.id, {
        status: "BUYER_RESERVED",
        message: `An interested buyer was found nearby (nearest of ${matches.length} candidate(s)). Product reserved — buyer identity is protected.`,
        patch: {
          reservedBuyerId: buyer.buyerId,
          reservedBuyerName: buyer.name,
          reservedDistanceKm: buyer.distanceKm,
        },
      });
      await returnCaseRepository.transition(c.id, {
        status: "SL_PICKUP_SCHEDULED",
        message: "Pickup scheduled with the delivery partner for physical verification.",
      });
      const updated = await returnCaseRepository.transition(c.id, {
        status: "DELIVERY_VERIFICATION",
        message:
          "Delivery partner en route to verify the item (existence, condition vs AI grade, completeness, eligibility).",
      });
      return { case: updated, found: true };
    },

    /** Delivery partner physically verifies the item and approves or rejects. */
    async verify(input: {
      caseId: string;
      approved: boolean;
      notes?: string;
    }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["DELIVERY_VERIFICATION"], "verify");

      if (!input.approved) {
        const reason = input.notes?.trim() || "Condition did not match the AI grade.";
        // Second-hand item rejected at verification → escalate to an admin who
        // decides keep-vs-remove. Leave the listing as-is for now; the admin's
        // decision (`resolveDeliveryRejection`) relists or pulls it.
        return returnCaseRepository.transition(c.id, {
          status: "DELIVERY_REJECTED_REVIEW",
          message: `Delivery partner REJECTED the transfer: ${reason}. Escalated for manual review — an admin will decide whether to keep the item in inventory or remove it from the store.`,
          patch: {
            verificationApproved: false,
            verificationNotes: input.notes ?? null,
            rejectionReason: reason,
          },
        });
      }

      // Approved → pick up, route to buyer, refund customer, complete.
      await returnCaseRepository.transition(c.id, {
        status: "TRANSFER_APPROVED",
        message: `Delivery partner APPROVED: product exists, condition matches Grade ${c.grade}, complete and eligible. Picked up and routed to the buyer.`,
        patch: { verificationApproved: true, verificationNotes: input.notes ?? null },
      });

      const refundAmount = c.item.originalPrice;
      await returnCaseRepository.transition(c.id, {
        status: "REFUND_INITIATED",
        message: `Refund of ₹${refundAmount} initiated to the original customer.`,
        patch: { refundInitiatedAt: new Date(), refundAmount },
      });

      // Complete the marketplace transaction + award green credits for reuse.
      if (c.secondLifeListingId) {
        await listingRepository.updateStatus(c.secondLifeListingId, "SOLD");
      }
      await itemRepository.updateStatus(c.itemId, "SOLD");
      if (c.orderId) await orderRepository.updateStatus(c.orderId, "RETURNED");
      const credits = await creditsService.award({
        action: "PEER_TO_PEER",
        category: c.item.category,
        originalPrice: c.item.originalPrice,
        itemId: c.itemId,
      });

      return returnCaseRepository.transition(c.id, {
        status: "COMPLETED",
        message: `Marketplace transaction completed. +${credits.credits} Amazon Nemo Credits, ${credits.co2SavedKg}kg CO₂ avoided.`,
        data: { credits } as unknown as Prisma.InputJsonValue,
      });
    },

    /**
     * No buyer within the window → liquidation/disposition. Honors the real
     * deadline; `force` is an explicit demo override (the window is real time).
     */
    async expire(input: {
      caseId: string;
      force?: boolean;
    }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["SECOND_LIFE_LISTED"], "expire window");

      const expired =
        c.secondLifeDeadline != null &&
        Date.now() >= new Date(c.secondLifeDeadline).getTime();
      if (!expired && !input.force) {
        throw new ConflictError("Second Life window is still active.");
      }

      await returnCaseRepository.transition(c.id, {
        status: "WINDOW_EXPIRED",
        message: input.force
          ? "Second Life window closed (no buyer found). Proceeding to disposition."
          : "Second Life window expired with no buyer. Proceeding to disposition.",
      });

      // Decide disposition through the real routing engine (no hardcoding).
      const feas = c.feasibility as
        | { expectedResaleValue?: number; totalProcessingCost?: number }
        | null;
      const decision = await routingService.route({
        itemId: c.itemId,
        context: {
          grade: c.grade ?? "D",
          category: c.item.category,
          relistingCost: feas?.totalProcessingCost ?? c.item.originalPrice * 0.1,
          resaleValue: feas?.expectedResaleValue ?? c.item.originalPrice * 0.3,
          nearbyDemandCount: 0, // no buyer was found
          repairability: c.item.repairability,
        },
      });
      const disposition = PATH_TO_DISPOSITION[decision.path];

      // #26: a DONATE classification is not auto-executed — the user must choose
      // to donate through Amazon or discard the request.
      if (disposition === "DONATED") {
        return returnCaseRepository.transition(c.id, {
          status: "DONATION_PENDING",
          message: `Classified for DONATION. ${decision.reasoning} Awaiting your choice: donate through Amazon, or discard the request.`,
          patch: { disposition: "DONATED" },
        });
      }

      await returnCaseRepository.transition(c.id, {
        status: "LIQUIDATION_PICKUP",
        message: "Normal pickup scheduled; delivery partner collecting the product for disposition.",
      });

      if (c.secondLifeListingId) {
        await listingRepository.updateStatus(c.secondLifeListingId, "INACTIVE");
      }
      await itemRepository.updateStatus(c.itemId, DISPOSITION_TO_ITEM_STATUS[disposition]);
      if (c.orderId) await orderRepository.updateStatus(c.orderId, "RETURNED");

      return returnCaseRepository.transition(c.id, {
        status: "LIQUIDATED",
        message: `Entered disposition flow → ${disposition}. Routing rationale: ${decision.reasoning}`,
        data: { disposition, routing: decision } as unknown as Prisma.InputJsonValue,
        patch: { disposition },
      });
    },

    /** #26: resolve a DONATION_PENDING case — donate through Amazon, or discard. */
    async donationDecision(input: {
      caseId: string;
      action: "donate" | "discard";
    }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["DONATION_PENDING"], "decide donation");

      if (input.action === "discard") {
        if (c.secondLifeListingId) {
          await listingRepository.updateStatus(c.secondLifeListingId, "INACTIVE");
        }
        // Item stays with the customer; the return request is discarded.
        await itemRepository.updateStatus(c.itemId, "GRADED");
        if (c.orderId) await orderRepository.updateStatus(c.orderId, "DELIVERED");
        return returnCaseRepository.transition(c.id, {
          status: "DISCARDED",
          message: "Donation request discarded by the user. The item stays with the customer.",
        });
      }

      // Donate through Amazon → schedule pickup → complete donation.
      await returnCaseRepository.transition(c.id, {
        status: "LIQUIDATION_PICKUP",
        message: "Donation confirmed. Pickup scheduled; delivery partner collecting the item.",
      });
      if (c.secondLifeListingId) {
        await listingRepository.updateStatus(c.secondLifeListingId, "INACTIVE");
      }
      await itemRepository.updateStatus(c.itemId, "DONATED");
      if (c.orderId) await orderRepository.updateStatus(c.orderId, "RETURNED");

      // Donating is a second-life action → award impact credits.
      const credits = await creditsService.award({
        action: "DONATE",
        category: c.item.category,
        originalPrice: c.item.originalPrice,
        userId: c.userId,
        itemId: c.itemId,
      });

      return returnCaseRepository.transition(c.id, {
        status: "LIQUIDATED",
        message: `Donated through Amazon to a partner charity. +${credits.credits} Amazon Nemo Credits, ${credits.co2SavedKg}kg CO₂ avoided.`,
        data: { disposition: "DONATED", credits } as unknown as Prisma.InputJsonValue,
        patch: { disposition: "DONATED" },
      });
    },

    /**
     * Admin resolves a delivery-partner rejection of a second-hand item: either
     * KEEP it in the store (relist it for resale — reactivating the existing
     * second-life listing, or creating one if the rejection happened before any
     * listing existed) or REMOVE it from the store completely (deactivate the
     * listing and route the item out of inventory so it can't be sold again).
     */
    async resolveDeliveryRejection(input: {
      caseId: string;
      action: "KEEP" | "REMOVE";
      reviewer: string;
      reason?: string;
    }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["DELIVERY_REJECTED_REVIEW"], "resolve delivery rejection");
      const note = input.reason?.trim();
      const suffix = note ? ` ${note}` : "";

      if (input.action === "REMOVE") {
        // Pull it from the store for good: deactivate any listing + route the
        // item out of inventory.
        if (c.secondLifeListingId) {
          await listingRepository.updateStatus(c.secondLifeListingId, "INACTIVE");
        }
        await itemRepository.updateStatus(c.itemId, "ROUTED");
        if (c.orderId) await orderRepository.updateStatus(c.orderId, "RETURNED");
        return returnCaseRepository.transition(c.id, {
          status: "TRANSFER_REJECTED",
          message: `Admin (${input.reviewer}) REMOVED the item from the store completely after the delivery rejection — listing deactivated and item routed out of inventory.${suffix}`,
          patch: { disposition: "LIQUIDATED", verificationNotes: note ?? c.verificationNotes ?? null },
        });
      }

      // KEEP → ensure the item is back in the store as an ACTIVE marketplace listing.
      let listingId = c.secondLifeListingId;
      if (listingId) {
        await listingRepository.updateStatus(listingId, "ACTIVE");
      } else {
        // No second-life listing yet (e.g. a return-pickup rejection) — create one
        // so the item actually re-enters the store, priced by the real engine.
        const grade = c.grade ?? "C";
        const latestGrade = await gradeRepository.findLatestForItem(c.itemId);
        const pricing = await pricingService.price({
          grade,
          originalPrice: c.item.originalPrice,
          category: c.item.category,
          demandCount: 0,
        });
        const listing = await listingService.create({
          itemId: c.itemId,
          grade,
          confidence: latestGrade?.confidence ?? c.gradeConfidence ?? 0.9,
          flaws:
            (latestGrade?.flaws as unknown as
              | { type: string; severity: "minor" | "moderate" | "severe"; location: string }[]
              | null) ?? [],
          price: pricing.price,
          pricePct: pricing.pricePct,
          history: [
            `Return rejected at pickup: ${c.rejectionReason ?? c.reason}`,
            "Kept in store by Operations review — relisted for resale",
          ],
        });
        listingId = listing.id;
      }
      await itemRepository.updateStatus(c.itemId, "LISTED");

      const config = await configRepository.getRules();
      const deadline = new Date(Date.now() + config.secondLifeWindowDays * 86_400_000);
      return returnCaseRepository.transition(c.id, {
        status: "SECOND_LIFE_LISTED",
        message: `Admin (${input.reviewer}) KEPT the item in the store inventory after the delivery rejection — relisted for resale in the Second Life marketplace.${suffix}`,
        patch: { secondLifeListingId: listingId, secondLifeDeadline: deadline },
      });
    },

    /**
     * Circular Commerce Decision Engine — APPLY a route (the recommended one, or
     * a manual override). Drives the existing disposition machinery so nothing is
     * duplicated: resale routes list the item for Second Life, DONATE parks it for
     * the donate/discard choice, RECYCLE routes it to material recovery. The chosen
     * route + whether it overrode the recommendation is captured in the audit trail.
     */
    async applyCircularRoute(input: {
      caseId: string;
      route: RoutingPath;
      overridden?: boolean;
      reason?: string;
    }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(
        c.status,
        ["GRADED", "FEASIBILITY_ANALYZED", "SECOND_LIFE_LISTED", "MANUAL_REVIEW"],
        "apply route",
      );
      const who = input.overridden ? "Manually overridden" : "Auto-routed by Nemo";
      const tail = input.reason?.trim() ? ` ${input.reason.trim()}` : "";
      const auditData = {
        chosenRoute: input.route,
        overridden: !!input.overridden,
        reason: input.reason ?? null,
      } as unknown as Prisma.InputJsonValue;

      // ── DONATE ──────────────────────────────────────────────────────────
      if (input.route === "DONATE") {
        if (c.secondLifeListingId) {
          await listingRepository.updateStatus(c.secondLifeListingId, "INACTIVE");
        }
        return returnCaseRepository.transition(c.id, {
          status: "DONATION_PENDING",
          message: `${who} → DONATE. Awaiting your choice: donate through Amazon, or discard.${tail}`,
          data: auditData,
          patch: { disposition: "DONATED" },
        });
      }

      // ── RECYCLE ─────────────────────────────────────────────────────────
      if (input.route === "RECYCLE") {
        if (c.secondLifeListingId) {
          await listingRepository.updateStatus(c.secondLifeListingId, "INACTIVE");
        }
        await itemRepository.updateStatus(c.itemId, "RECYCLED");
        if (c.orderId) await orderRepository.updateStatus(c.orderId, "RETURNED");
        return returnCaseRepository.transition(c.id, {
          status: "LIQUIDATED",
          message: `${who} → RECYCLE. Routed to certified material recovery — repair cost exceeds recovery value.${tail}`,
          data: auditData,
          patch: { disposition: "RECYCLED" },
        });
      }

      // ── Resale family (RESELL_AS_IS · REFURBISH · PEER_TO_PEER) ──────────
      // Ensure the item is live in the Second Life marketplace.
      if (c.status === "SECOND_LIFE_LISTED" && c.secondLifeListingId) {
        if (c.secondLifeListingId) {
          await listingRepository.updateStatus(c.secondLifeListingId, "ACTIVE");
        }
        return returnCaseRepository.transition(c.id, {
          status: "SECOND_LIFE_LISTED",
          message: `${who} → ${input.route}. Confirmed for Second Life resale; searching for nearby buyers.${tail}`,
          data: auditData,
        });
      }

      // Not yet listed → create the listing now (mirrors the not-feasible branch).
      if (!c.grade) throw new ConflictError("Case must be graded before routing.");
      const config = await configRepository.getRules();
      const origin =
        c.pickupLat != null && c.pickupLng != null
          ? { lat: c.pickupLat, lng: c.pickupLng }
          : CUSTOMER_LOCATION;
      const nearby = await matchingService.findNearby({ category: c.item.category, origin });
      const pricing = await pricingService.price({
        grade: c.grade,
        originalPrice: c.item.originalPrice,
        category: c.item.category,
        demandCount: nearby.length,
      });
      const latestGrade = await gradeRepository.findLatestForItem(c.itemId);
      const listing = await listingService.create({
        itemId: c.itemId,
        grade: c.grade,
        confidence: latestGrade?.confidence ?? c.gradeConfidence ?? 0.9,
        flaws:
          (latestGrade?.flaws as unknown as
            | { type: string; severity: "minor" | "moderate" | "severe"; location: string }[]
            | null) ?? [],
        price: pricing.price,
        pricePct: pricing.pricePct,
        history: [
          `Returned: ${c.reason}`,
          `${who} to ${input.route} by the Circular Decision Engine`,
        ],
      });
      const deadline = new Date(Date.now() + config.secondLifeWindowDays * 86_400_000);
      return returnCaseRepository.transition(c.id, {
        status: "SECOND_LIFE_LISTED",
        message: `${who} → ${input.route}. Listed in the Second Life marketplace at ₹${pricing.price} for a ${config.secondLifeWindowDays}-day window.${tail}`,
        data: { ...(auditData as object), listingId: listing.id, price: pricing.price } as unknown as Prisma.InputJsonValue,
        patch: { secondLifeListingId: listing.id, secondLifeDeadline: deadline },
      });
    },

    /**
     * The customer/operator isn't satisfied with the automatic recommendation →
     * escalate to the Operations team. Reuses the MANUAL_REVIEW state (admins
     * accept/reject via the existing console tools). Any live listing is paused.
     */
    async escalateForReview(input: { caseId: string; reason?: string }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(
        c.status,
        ["GRADED", "FEASIBILITY_ANALYZED", "SECOND_LIFE_LISTED"],
        "escalate for review",
      );
      if (c.secondLifeListingId) {
        await listingRepository.updateStatus(c.secondLifeListingId, "INACTIVE");
      }
      const tail = input.reason?.trim() ? ` Reason: ${input.reason.trim()}.` : "";
      return returnCaseRepository.transition(c.id, {
        status: "MANUAL_REVIEW",
        message: `Routing escalated to Operations review — the recommended route wasn't accepted.${tail} An admin will confirm the best outcome.`,
        patch: { verificationApproved: null },
      });
    },

    /**
     * Admin ACCEPTS a verification escalation: the item is confirmed genuine, so
     * we bypass the failing AI gate, grade the photos the customer already
     * submitted, and continue the workflow (grade → feasibility analysis).
     */
    async adminApproveVerification(input: {
      caseId: string;
      reviewer: string;
    }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["MANUAL_REVIEW", "EVIDENCE_REQUESTED"], "approve verification");

      const stored = (c.returnPhotos as unknown as
        | { data: string; mimeType: string; role: string }[]
        | null) ?? [];
      if (stored.length === 0) {
        throw new ConflictError("No submitted photos on file to grade.");
      }
      const images: RoledImageInput[] = stored.map((p) => ({
        base64: p.data,
        mimeType: (p.mimeType as RoledImageInput["mimeType"]) ?? "image/jpeg",
        role: (p.role as RoledImageInput["role"]) ?? "other",
      }));

      // Grade directly — the admin has already vouched for authenticity, so the
      // verification gate (and its quality-confidence floor) is intentionally
      // bypassed here.
      const result = await gradingService.grade({
        images,
        itemId: c.itemId,
        verification: {
          productMatchConfidence: c.productMatchConfidence ?? 1,
          fraudRiskScore: c.fraudRiskScore ?? 0,
        },
      });
      const latest = await gradeRepository.findLatestForItem(c.itemId);

      await returnCaseRepository.transition(c.id, {
        status: "GRADED",
        message: `Admin (${input.reviewer}) verified the item as genuine. Bypassed the AI gate and graded: Grade ${result.grade} (${Math.round(
          result.confidence * 100,
        )}% quality confidence). ${result.summary}`,
        data: { grade: result.grade, confidence: result.confidence, flaws: result.flaws } as unknown as Prisma.InputJsonValue,
        patch: {
          grade: result.grade,
          gradeConfidence: result.confidence,
          gradeResultId: latest?.id ?? null,
        },
      });

      // Leave the case at GRADED — the Circular Commerce Decision Engine takes
      // over on the customer's return page (recommend → accept / override /
      // escalate), exactly like the normal post-grade flow. No auto-analyze
      // cascade, so the decision panel is what the customer sees after approval.
      return load(c.id);
    },

    /** Admin REJECTS a verification escalation: the return request is denied. */
    async adminRejectVerification(input: {
      caseId: string;
      reason: string;
      reviewer: string;
    }): Promise<ReturnCaseWithRelations> {
      const c = await load(input.caseId);
      assertStatus(c.status, ["MANUAL_REVIEW", "EVIDENCE_REQUESTED"], "reject verification");
      if (c.orderId) await orderRepository.updateStatus(c.orderId, "DELIVERED");
      return returnCaseRepository.transition(c.id, {
        status: "DISCARDED",
        message: `Admin (${input.reviewer}) could not verify the item — return request rejected. ${input.reason}`,
        patch: { rejectionReason: input.reason },
      });
    },
  };
}

export const returnWorkflowService = createReturnWorkflowService();
