import type { ReturnStatus } from "@prisma/client";
import { CUSTOMER_LOCATION } from "@/config/constants";
import { NotFoundError } from "@/lib/errors";
import { returnCaseRepository, type ReturnCaseWithRelations } from "@/repositories/return-case.repository";
import { buyerRepository } from "@/repositories/buyer.repository";
import { creditRepository } from "@/repositories/credit.repository";
import { gradeRepository } from "@/repositories/grade.repository";
import { returnRepository } from "@/repositories/return.repository";
import { configRepository } from "@/repositories/config.repository";
import { matchingService } from "@/services/matching/matching.service";
import { pricingService } from "@/services/pricing/pricing.service";
import { decideWith, parseRules } from "@/services/routing/routing.service";
import type { FeasibilityResult } from "@/services/feasibility/feasibility.service";

/**
 * Admin service — read-side aggregations powering the operations console:
 * the live returns queue, the decision explorer (with live-recomputed routing),
 * the matching map, impact analytics, and prevention insights.
 */

export function pathLabel(c: { status: ReturnStatus; decision: string | null; disposition: string | null }): string {
  switch (c.status) {
    case "INITIATED":
    case "GRADED":
      return "Analyzing…";
    case "FEASIBILITY_ANALYZED":
      return c.decision === "FEASIBLE" ? "Return → seller" : "Second Life";
    case "RETURN_APPROVED":
    case "RETURN_PICKUP_SCHEDULED":
    case "RETURNED_TO_SELLER":
      return "Return to seller";
    case "SECOND_LIFE_LISTED":
      return "Second Life (listed)";
    case "BUYER_RESERVED":
    case "SL_PICKUP_SCHEDULED":
    case "DELIVERY_VERIFICATION":
      return "Peer-to-peer match";
    case "TRANSFER_APPROVED":
    case "REFUND_INITIATED":
    case "COMPLETED":
      return "Peer-to-peer (sold)";
    case "TRANSFER_REJECTED":
      return "Transfer rejected";
    case "WINDOW_EXPIRED":
    case "LIQUIDATION_PICKUP":
      return "Liquidation";
    case "LIQUIDATED":
      return c.disposition ?? "Liquidated";
    case "DONATION_PENDING":
      return "Donation (pending)";
    case "DISCARDED":
      return "Discarded";
    default:
      return c.status;
  }
}

function toRow(c: ReturnCaseWithRelations) {
  const feas = c.feasibility as FeasibilityResult | null;
  return {
    id: c.id,
    itemName: c.item.name,
    category: c.item.category,
    brand: c.item.brand,
    originalPrice: c.item.originalPrice,
    grade: c.grade,
    confidence: c.gradeConfidence,
    status: c.status,
    decision: c.decision,
    disposition: c.disposition,
    pathLabel: pathLabel(c),
    reservedBuyerName: c.reservedBuyerName,
    reservedDistanceKm: c.reservedDistanceKm,
    expectedResaleValue: feas?.expectedResaleValue ?? null,
    netRecoveryValue: feas?.netRecoveryValue ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

export function createAdminService() {
  return {
    async listCases() {
      const cases = await returnCaseRepository.listAll();
      return cases.map(toRow);
    },

    /** Decision Explorer: the case + a LIVE-recomputed Smart Router decision. */
    async caseDetail(id: string) {
      const c = await returnCaseRepository.findById(id);
      if (!c) throw new NotFoundError(`Return case ${id} not found.`);
      const config = await configRepository.getRules();
      const rules = parseRules(config);

      const nearby = await matchingService.findNearby({
        category: c.item.category,
        origin: CUSTOMER_LOCATION,
      });

      const feas = c.feasibility as FeasibilityResult | null;
      const resaleValue =
        feas?.expectedResaleValue ??
        (
          await pricingService.price({
            grade: c.grade ?? "B",
            originalPrice: c.item.originalPrice,
            category: c.item.category,
            demandCount: nearby.length,
          })
        ).price;
      const relistingCost = feas?.totalProcessingCost ?? Math.round(c.item.originalPrice * 0.1);

      const routing = decideWith(
        {
          grade: c.grade ?? "B",
          category: c.item.category,
          relistingCost,
          resaleValue,
          nearbyDemandCount: nearby.length,
          repairability: c.item.repairability,
        },
        rules,
      );

      return {
        case: {
          id: c.id,
          itemName: c.item.name,
          category: c.item.category,
          brand: c.item.brand,
          originalPrice: c.item.originalPrice,
          grade: c.grade,
          confidence: c.gradeConfidence,
          status: c.status,
          decision: c.decision,
          disposition: c.disposition,
          reason: c.reason,
          reservedBuyerName: c.reservedBuyerName,
          reservedDistanceKm: c.reservedDistanceKm,
          pathLabel: pathLabel(c),
        },
        feasibility: feas,
        routing,
        nearbyDemandCount: nearby.length,
        events: c.events.map((e) => ({
          status: e.status,
          message: e.message,
          createdAt: e.createdAt.toISOString(),
        })),
      };
    },

    /** Matching Map: buyers, return-item origins, and the match connections. */
    async mapData() {
      const [buyers, cases, config] = await Promise.all([
        buyerRepository.list(),
        returnCaseRepository.listAll(),
        configRepository.getRules(),
      ]);
      const buyerById = new Map(buyers.map((b) => [b.id, b]));

      const returns = cases.map((c) => {
        const b = c.reservedBuyerId ? buyerById.get(c.reservedBuyerId) : null;
        return {
          id: c.id,
          itemName: c.item.name,
          category: c.item.category,
          status: c.status,
          pathLabel: pathLabel(c),
          matched: !!b,
          buyer: b
            ? { name: b.name, lat: b.lat, lng: b.lng, distanceKm: c.reservedDistanceKm }
            : null,
        };
      });

      return {
        origin: CUSTOMER_LOCATION,
        radiusKm: config.matchRadiusKm,
        buyers: buyers.map((b) => ({
          id: b.id,
          name: b.name,
          lat: b.lat,
          lng: b.lng,
          wishlist: b.wishlist,
        })),
        returns,
      };
    },

    /** Impact & operations analytics. */
    async analytics() {
      const [cases, impact, grading] = await Promise.all([
        returnCaseRepository.listAll(),
        creditRepository.totalsAllUsers(),
        gradeRepository.stats(),
      ]);

      const byPath: Record<string, number> = {};
      let diverted = 0;
      let recycled = 0;
      for (const c of cases) {
        const label = pathLabel(c);
        byPath[label] = (byPath[label] ?? 0) + 1;
        if (c.status === "LIQUIDATED" && c.disposition === "RECYCLED") recycled++;
        else if (
          ["RETURNED_TO_SELLER", "COMPLETED", "DONATION_PENDING", "LIQUIDATED"].includes(c.status) ||
          ["BUYER_RESERVED", "SL_PICKUP_SCHEDULED", "DELIVERY_VERIFICATION", "TRANSFER_APPROVED", "REFUND_INITIATED"].includes(c.status)
        ) {
          diverted++;
        }
      }

      return {
        totalReturns: cases.length,
        divertedFromLandfill: diverted,
        recycled,
        co2SavedKg: Number(impact.totalCo2SavedKg.toFixed(1)),
        costSaved: Math.round(impact.totalCostSaved),
        creditsIssued: impact.totalCredits,
        secondLifeActions: impact.count,
        avgGradingMs: grading.avgTookMs,
        underTwoSecPct: grading.underTwoSecPct,
        pathBreakdown: Object.entries(byPath)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
      };
    },

    /** Prevention insights — learned return-reason patterns per category. */
    async prevention() {
      const returns = await returnRepository.listAllWithItem();
      const byCategory = new Map<string, Map<string, number>>();
      for (const r of returns) {
        const cat = r.item.category;
        if (!byCategory.has(cat)) byCategory.set(cat, new Map());
        const m = byCategory.get(cat)!;
        m.set(r.reason, (m.get(r.reason) ?? 0) + 1);
      }

      return Array.from(byCategory.entries()).map(([category, reasons]) => {
        const entries = Array.from(reasons.entries()).sort((a, b) => b[1] - a[1]);
        const total = entries.reduce((s, [, n]) => s + n, 0);
        const [topReason, topCount] = entries[0];
        const topPct = Math.round((topCount / total) * 100);
        return {
          category,
          sampleSize: total,
          topReason,
          topPct,
          reasons: entries.map(([reason, count]) => ({ reason, count })),
          nudge:
            topReason.toLowerCase().includes("size") || topReason.toLowerCase().includes("fit")
              ? `${topPct}% of ${category} returns are sizing-related — surface a size-guide nudge and fit recommendations before purchase.`
              : `${topPct}% of ${category} returns cite "${topReason}" — surface a targeted pre-purchase nudge to prevent it.`,
        };
      });
    },
  };
}

export const adminService = createAdminService();
