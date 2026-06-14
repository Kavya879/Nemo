import type { ReturnStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { configRepository } from "@/repositories/config.repository";
import { ConflictError } from "@/lib/errors";

/**
 * Return-in-Transit Deals.
 *
 * When a customer initiates a valid return, the item enters the return pipeline.
 * Rather than wait for warehouse intake → inspection → grading → relisting, we
 * offer it to nearby buyers immediately at a discount that GROWS with the number
 * of days it has sat unsold in the pipeline. The discount tiers and the
 * estimated-arrival horizon are config-driven (RoutingConfig) — never hardcoded.
 *
 * Because the discount is derived from elapsed days at read time, it is always
 * current; the "daily recalculation" happens implicitly on every request.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Pipeline states in which an item is still in transit and sellable early. */
const TRANSIT_SELLABLE_STATES: ReturnStatus[] = [
  "INITIATED",
  "VERIFYING",
  "EVIDENCE_REQUESTED",
  "MANUAL_REVIEW",
  "GRADED",
  "FEASIBILITY_ANALYZED",
  "RETURN_APPROVED",
  "RETURN_PICKUP_SCHEDULED",
];

export type TransitBadge = "In Return Pipeline" | "Arriving Soon" | "Smart Deal";

export interface ReturnDeal {
  returnCaseId: string;
  itemId: string;
  name: string;
  category: string;
  brand: string | null;
  imageUrl: string | null;
  originalPrice: number;
  discountPct: number; // 0..1
  discountedPrice: number;
  daysInPipeline: number;
  estimatedArrival: string; // ISO date
  badge: TransitBadge;
}

interface DiscountTier {
  minDays: number;
  pct: number;
}

/** Highest tier whose `minDays` ≤ elapsed days wins (0 if none configured). */
export function discountForDays(days: number, tiers: DiscountTier[]): number {
  let pct = 0;
  for (const t of tiers) {
    if (days >= t.minDays && t.pct > pct) pct = t.pct;
  }
  return pct;
}

function parseTiers(raw: unknown): DiscountTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is DiscountTier =>
        !!t && typeof (t as DiscountTier).minDays === "number" && typeof (t as DiscountTier).pct === "number",
    )
    .map((t) => ({ minDays: t.minDays, pct: t.pct }));
}

function badgeFor(discountPct: number, daysUntilArrival: number): TransitBadge {
  if (discountPct > 0) return "Smart Deal";
  if (daysUntilArrival <= 2) return "Arriving Soon";
  return "In Return Pipeline";
}

export const returnDealsService = {
  /** Active in-transit deals with their live (config-driven) discount + arrival. */
  async listActive(now: number = Date.now()): Promise<ReturnDeal[]> {
    const config = await configRepository.getRules();
    const tiers = parseTiers(config.returnTransitDiscountTiers);
    const arrivalDays = config.returnTransitArrivalDays;

    const [cases, activeListings] = await Promise.all([
      prisma.returnCase.findMany({
        where: {
          status: { in: TRANSIT_SELLABLE_STATES },
          transitSold: false,
        },
        include: { item: true },
        orderBy: { createdAt: "asc" }, // longest-waiting first (biggest discount)
      }),
      prisma.listing.findMany({ where: { status: "ACTIVE" }, select: { itemId: true } }),
    ]);
    // Don't double-list items that already have an active second-life listing,
    // or items already sold/reserved elsewhere.
    const listedItemIds = new Set(activeListings.map((l) => l.itemId));

    const deals: ReturnDeal[] = [];
    const seenItems = new Set<string>();
    for (const c of cases) {
      if (listedItemIds.has(c.itemId)) continue;
      if (["SOLD", "DONATED", "RECYCLED"].includes(c.item.status)) continue;
      if (seenItems.has(c.itemId)) continue; // one deal per item
      seenItems.add(c.itemId);

      const daysInPipeline = Math.max(0, Math.floor((now - new Date(c.createdAt).getTime()) / DAY_MS));
      const discountPct = discountForDays(daysInPipeline, tiers);
      const discountedPrice = Math.round(c.item.originalPrice * (1 - discountPct));
      const arrivalMs = new Date(c.createdAt).getTime() + arrivalDays * DAY_MS;
      const daysUntilArrival = Math.ceil((arrivalMs - now) / DAY_MS);

      deals.push({
        returnCaseId: c.id,
        itemId: c.itemId,
        name: c.item.name,
        category: c.item.category,
        brand: c.item.brand,
        imageUrl: c.item.imageUrl,
        originalPrice: c.item.originalPrice,
        discountPct,
        discountedPrice,
        daysInPipeline,
        estimatedArrival: new Date(arrivalMs).toISOString(),
        badge: badgeFor(discountPct, daysUntilArrival),
      });
    }
    return deals;
  },

  /** Price a single in-transit deal at checkout time (authoritative server price). */
  async priceFor(returnCaseId: string, now: number = Date.now()): Promise<number> {
    const config = await configRepository.getRules();
    const tiers = parseTiers(config.returnTransitDiscountTiers);
    const c = await prisma.returnCase.findUnique({ where: { id: returnCaseId }, include: { item: true } });
    if (!c) throw new ConflictError("This in-transit deal no longer exists.");
    const days = Math.max(0, Math.floor((now - new Date(c.createdAt).getTime()) / DAY_MS));
    return Math.round(c.item.originalPrice * (1 - discountForDays(days, tiers)));
  },

  /**
   * Atomically reserve an in-transit deal for a buyer. The conditional update
   * (transitSold:false, still in a sellable state) guarantees only ONE buyer can
   * ever win it — preventing double purchases. Returns false if already taken.
   */
  async reserve(input: { returnCaseId: string; buyerId: string; buyerName?: string }): Promise<boolean> {
    const res = await prisma.returnCase.updateMany({
      where: {
        id: input.returnCaseId,
        transitSold: false,
        status: { in: TRANSIT_SELLABLE_STATES },
      },
      data: {
        transitSold: true,
        transitBuyerId: input.buyerId,
        transitBuyerName: input.buyerName ?? null,
        transitReservedAt: new Date(),
      },
    });
    if (res.count === 0) return false;

    // Take the item out of public availability and record the event on the case.
    const c = await prisma.returnCase.findUnique({ where: { id: input.returnCaseId } });
    if (c) {
      await prisma.item.update({ where: { id: c.itemId }, data: { status: "SOLD" } }).catch(() => undefined);
      await prisma.returnEvent.create({
        data: {
          returnCaseId: c.id,
          status: c.status,
          message:
            "Sold in transit to a nearby buyer at the in-transit deal price — item reserved and removed from public listings.",
        },
      });
    }
    return true;
  },
};
