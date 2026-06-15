import type { ReturnCaseWithRelations } from "@/repositories/return-case.repository";
import { returnCaseRepository } from "@/repositories/return-case.repository";
import type { OrderWithItem } from "@/repositories/order.repository";
import { orderRepository } from "@/repositories/order.repository";
import { configRepository } from "@/repositories/config.repository";
import { CUSTOMER_LOCATION } from "@/config/constants";
import { haversineKm, nearestWarehouse } from "@/lib/geo";
import { reverseGeocode } from "@/lib/geocode";
import { isGoodTransitGrade, TRANSIT_SELLABLE_STATES } from "@/services/return-deals/return-deals.service";

/**
 * Delivery-partner board — the day's physical tasks. Three task families:
 *
 *  • PICKUPS — collect something:
 *      - RETURN_PICKUP      → collect a return from the customer → seller/FC.
 *      - VERIFY_EXCHANGE    → collect + verify a second-life item → hand to buyer.
 *      - WAREHOUSE_PICKUP   → an in-transit deal's 7-day window expired unsold;
 *                             collect it and route it to the nearest Amazon FC.
 *  • DELIVERIES — hand a sold second-hand item to its buyer:
 *      - BUYER_DELIVERY     → every sold second-hand item (a normal marketplace
 *                             sale OR an in-transit deal someone just bought)
 *                             appears here immediately, with the buyer's and the
 *                             sender's addresses.
 *  • COMPLETED — recently-finished drops/deliveries.
 */

export interface DeliveryTask {
  /** Stable key: the return-case id for pickups, the order id for deliveries. */
  caseId: string;
  /** Set for buyer deliveries (order-backed). Null for return-case tasks. */
  orderId: string | null;
  itemName: string;
  category: string;
  brand: string | null;
  originalImageUrl: string | null;
  returnPhotos: { data: string; mimeType: string; role: string }[];
  reason: string;
  kind: "RETURN_PICKUP" | "VERIFY_EXCHANGE" | "WAREHOUSE_PICKUP" | "BUYER_DELIVERY" | "DROP";
  status: string;
  fromLabel: string;
  toLabel: string;
  distanceKm: number | null;
  grade: ReturnCaseWithRelations["grade"];
  /** The map focus point (pickup origin for pickups, buyer drop for deliveries). */
  lat: number;
  lng: number;
  locationLabel: string;
  createdAt: string;
}

export interface DeliveryBoard {
  pickups: DeliveryTask[];
  deliveries: DeliveryTask[];
  completed: DeliveryTask[];
  stats: { pickups: number; deliveries: number; completed: number };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function photosOf(rc: ReturnCaseWithRelations) {
  return (
    (rc.returnPhotos as unknown as { data: string; mimeType: string; role: string }[] | null) ?? []
  );
}

/** Deterministic small offset from a seed so demo addresses spread across the map. */
function pointFromSeed(seed: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const dLat = ((h % 1000) / 1000 - 0.5) * 0.12; // ~±6.6km
  const dLng = (((h >> 10) % 1000) / 1000 - 0.5) * 0.12;
  return { lat: CUSTOMER_LOCATION.lat + dLat, lng: CUSTOMER_LOCATION.lng + dLng };
}

function caseOrigin(rc: ReturnCaseWithRelations): { lat: number; lng: number } {
  if (rc.pickupLat != null && rc.pickupLng != null) {
    return { lat: rc.pickupLat, lng: rc.pickupLng };
  }
  return pointFromSeed(rc.id);
}

function locationFor(rc: ReturnCaseWithRelations): { lat: number; lng: number; locationLabel: string } {
  if (rc.pickupLat != null && rc.pickupLng != null) {
    return { lat: rc.pickupLat, lng: rc.pickupLng, locationLabel: "Pickup location" };
  }
  return { ...pointFromSeed(rc.id), locationLabel: "Bengaluru area" };
}

/** Human address for a point — reverse-geocoded, with a safe fallback. */
async function addressFor(lat: number, lng: number, fallback: string): Promise<string> {
  return (await reverseGeocode(lat, lng)) ?? fallback;
}

function baseTask(rc: ReturnCaseWithRelations): Omit<DeliveryTask, "kind" | "fromLabel" | "toLabel"> {
  return {
    caseId: rc.id,
    orderId: null,
    itemName: rc.item.name,
    category: rc.item.category,
    brand: rc.item.brand,
    originalImageUrl: rc.item.imageUrl,
    returnPhotos: photosOf(rc),
    reason: rc.reason,
    status: rc.status,
    distanceKm: rc.reservedDistanceKm,
    grade: rc.grade,
    ...locationFor(rc),
    createdAt: new Date(rc.createdAt).toISOString(),
  };
}

export const deliveryService = {
  async board(now: number = Date.now()): Promise<DeliveryBoard> {
    const config = await configRepository.getRules();
    const windowDays = config.returnTransitArrivalDays; // 7-day in-transit window

    const [cases, openDeliveries, recentDeliveries] = await Promise.all([
      returnCaseRepository.listAll(),
      orderRepository.listOpenItemDeliveries(),
      orderRepository.listRecentItemDeliveries(now - 2 * DAY_MS),
    ]);

    // ── Return-pipeline pickups (collect from the customer) ──────────────────
    const pickupCases = cases.filter(
      (rc) => rc.status === "RETURN_PICKUP_SCHEDULED" || rc.status === "DELIVERY_VERIFICATION",
    );

    // ── Expired in-transit items → warehouse pickup (req: >7 days, no buyer) ──
    // A good-grade return that was offered in transit but went unsold past the
    // window. Skip ones already handled by a normal return pickup/verification.
    const expiredTransitCases = cases.filter((rc) => {
      if (rc.transitSold || !isGoodTransitGrade(rc.grade)) return false;
      if (!TRANSIT_SELLABLE_STATES.includes(rc.status)) return false;
      if (["RETURN_PICKUP_SCHEDULED", "DELIVERY_VERIFICATION"].includes(rc.status)) return false;
      if (["SOLD", "DONATED", "RECYCLED", "ROUTED"].includes(rc.item.status)) return false;
      const days = Math.floor((now - new Date(rc.createdAt).getTime()) / DAY_MS);
      return days >= windowDays;
    });

    // Map original pickup origin → human address; To = nearest real Amazon FC.
    const returnPickups = await Promise.all(
      pickupCases.map(async (rc) => {
        const base = baseTask(rc);
        const fc = nearestWarehouse({ lat: base.lat, lng: base.lng });
        return {
          ...base,
          kind: (rc.status === "RETURN_PICKUP_SCHEDULED" ? "RETURN_PICKUP" : "VERIFY_EXCHANGE") as
            | "RETURN_PICKUP"
            | "VERIFY_EXCHANGE",
          fromLabel: await addressFor(base.lat, base.lng, "Customer address"),
          toLabel: `${fc.warehouse.name} · ${fc.warehouse.city} (~${fc.distanceKm}km)`,
        };
      }),
    );

    const warehousePickups = await Promise.all(
      expiredTransitCases.map(async (rc) => {
        const base = baseTask(rc);
        const fc = nearestWarehouse({ lat: base.lat, lng: base.lng });
        return {
          ...base,
          kind: "WAREHOUSE_PICKUP" as const,
          reason: `In-transit window expired (${windowDays} days, no buyer) — route to warehouse`,
          distanceKm: fc.distanceKm,
          fromLabel: await addressFor(base.lat, base.lng, "Customer address"),
          toLabel: `${fc.warehouse.name} · ${fc.warehouse.city} (~${fc.distanceKm}km)`,
        };
      }),
    );

    // ── Buyer deliveries (every sold second-hand item, immediately) ──────────
    // Sender = the in-transit return customer (if this was an in-transit deal) or
    // the marketplace seller; Buyer = the order's owner. Both get real addresses.
    const transitByItem = new Map<string, ReturnCaseWithRelations>();
    for (const rc of cases) {
      if (rc.transitSold) transitByItem.set(rc.itemId, rc);
    }

    const deliveries = await Promise.all(
      openDeliveries.map((order) => buildDelivery(order, transitByItem.get(order.itemId ?? ""))),
    );

    // ── Completed drops (return side) + recent buyer deliveries ──────────────
    const completedCases = cases.filter(
      (rc) =>
        [
          "COMPLETED",
          "RETURNED_TO_SELLER",
          "TRANSFER_APPROVED",
          "TRANSFER_REJECTED",
          "DELIVERY_REJECTED_REVIEW",
        ].includes(rc.status) && now - new Date(rc.updatedAt).getTime() <= 2 * DAY_MS,
    );
    const completedDrops: DeliveryTask[] = completedCases.slice(0, 10).map((rc) => ({
      ...baseTask(rc),
      kind: "DROP",
      fromLabel: "—",
      toLabel:
        rc.status === "RETURNED_TO_SELLER"
          ? "Seller / FC"
          : rc.status === "TRANSFER_REJECTED"
            ? "Rejected"
            : rc.status === "DELIVERY_REJECTED_REVIEW"
              ? "Under admin review"
              : "Buyer",
    }));
    const completedDeliveries: DeliveryTask[] = recentDeliveries.slice(0, 10).map((order) => ({
      caseId: order.id,
      orderId: order.id,
      itemName: order.item.name,
      category: order.item.category,
      brand: order.item.brand,
      originalImageUrl: order.item.imageUrl,
      returnPhotos: [],
      reason: "Delivered to buyer",
      kind: "DROP",
      status: order.status,
      fromLabel: "—",
      toLabel: "Buyer",
      distanceKm: null,
      grade: null,
      ...pointFromSeed(order.userId),
      locationLabel: "Buyer location",
      createdAt: new Date(order.deliveredAt ?? order.createdAt).toISOString(),
    }));

    const pickups = [...returnPickups, ...warehousePickups];
    const completed = [...completedDrops, ...completedDeliveries];

    return {
      pickups,
      deliveries,
      completed,
      stats: { pickups: pickups.length, deliveries: deliveries.length, completed: completed.length },
    };

    /** Build a buyer-delivery task with real buyer + sender addresses. */
    async function buildDelivery(
      order: OrderWithItem,
      transitCase: ReturnCaseWithRelations | undefined,
    ): Promise<DeliveryTask> {
      const buyer = pointFromSeed(order.userId);
      // Sender: the original return customer (in-transit deal) or the seller hub.
      const sender = transitCase
        ? caseOrigin(transitCase)
        : pointFromSeed(`${order.itemId}:seller`);
      const [buyerLabel, senderLabel] = await Promise.all([
        addressFor(buyer.lat, buyer.lng, "Buyer address"),
        addressFor(sender.lat, sender.lng, transitCase ? "Sender (returning customer)" : "Seller address"),
      ]);
      return {
        caseId: order.id,
        orderId: order.id,
        itemName: order.item.name,
        category: order.item.category,
        brand: order.item.brand,
        originalImageUrl: order.item.imageUrl,
        returnPhotos: [],
        reason: transitCase
          ? "In-transit deal purchased — deliver to buyer"
          : "Second-hand item sold — deliver to buyer",
        kind: "BUYER_DELIVERY",
        status: order.status,
        fromLabel: senderLabel,
        toLabel: buyerLabel,
        distanceKm: Number(haversineKm(sender, buyer).toFixed(1)),
        grade: null,
        lat: buyer.lat,
        lng: buyer.lng,
        locationLabel: "Buyer location",
        createdAt: new Date(order.createdAt).toISOString(),
      };
    }
  },
};
