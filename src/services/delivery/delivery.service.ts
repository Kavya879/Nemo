import type { ReturnCaseWithRelations } from "@/repositories/return-case.repository";
import { returnCaseRepository } from "@/repositories/return-case.repository";
import { CUSTOMER_LOCATION } from "@/config/constants";
import { nearestWarehouse } from "@/lib/geo";
import { reverseGeocode } from "@/lib/geocode";

/**
 * Delivery-partner board — the day's physical tasks, derived from active return
 * cases (no extra table). Everything actionable is a "pickup" the partner
 * accepts or rejects after inspecting it against the original product:
 *  • RETURN_PICKUP_SCHEDULED → collect from the customer, return to seller/FC.
 *  • DELIVERY_VERIFICATION → collect + verify it matches, hand to a nearby buyer.
 * Recently-finished cases show as completed drops.
 */

export interface DeliveryTask {
  caseId: string;
  itemName: string;
  category: string;
  brand: string | null;
  originalImageUrl: string | null;
  returnPhotos: { data: string; mimeType: string; role: string }[];
  reason: string;
  /** RETURN_PICKUP = return to seller; VERIFY_EXCHANGE = hand to buyer. */
  kind: "RETURN_PICKUP" | "VERIFY_EXCHANGE" | "DROP";
  status: string;
  fromLabel: string;
  toLabel: string;
  distanceKm: number | null;
  grade: ReturnCaseWithRelations["grade"];
  /** Pickup location for the route map. */
  lat: number;
  lng: number;
  locationLabel: string;
  createdAt: string;
}

export interface DeliveryBoard {
  pickups: DeliveryTask[];
  completed: DeliveryTask[];
  stats: { pickups: number; completed: number };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function photosOf(rc: ReturnCaseWithRelations) {
  return (
    (rc.returnPhotos as unknown as { data: string; mimeType: string; role: string }[] | null) ?? []
  );
}

/** Deterministic small offset from a case id so demo pickups spread across the map. */
function demoCoords(caseId: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < caseId.length; i++) h = (h * 31 + caseId.charCodeAt(i)) | 0;
  const dLat = ((h % 1000) / 1000 - 0.5) * 0.12; // ~±6.6km
  const dLng = (((h >> 10) % 1000) / 1000 - 0.5) * 0.12;
  return { lat: CUSTOMER_LOCATION.lat + dLat, lng: CUSTOMER_LOCATION.lng + dLng };
}

function locationFor(rc: ReturnCaseWithRelations): { lat: number; lng: number; locationLabel: string } {
  if (rc.pickupLat != null && rc.pickupLng != null) {
    return { lat: rc.pickupLat, lng: rc.pickupLng, locationLabel: "Pickup location" };
  }
  const c = demoCoords(rc.id);
  return { ...c, locationLabel: "Bengaluru area" };
}

function baseTask(rc: ReturnCaseWithRelations): Omit<DeliveryTask, "kind" | "fromLabel" | "toLabel"> {
  return {
    caseId: rc.id,
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
    const cases = await returnCaseRepository.listAll();

    const pickupCases = cases.filter(
      (rc) => rc.status === "RETURN_PICKUP_SCHEDULED" || rc.status === "DELIVERY_VERIFICATION",
    );
    const completedCases = cases.filter(
      (rc) =>
        ["COMPLETED", "RETURNED_TO_SELLER", "TRANSFER_APPROVED", "TRANSFER_REJECTED"].includes(
          rc.status,
        ) && now - new Date(rc.updatedAt).getTime() <= 2 * DAY_MS,
    );

    // From = the customer's actual (reverse-geocoded) address; To = the nearest
    // real Amazon fulfillment center to that location.
    const pickups = await Promise.all(
      pickupCases.map(async (rc) => {
        const base = baseTask(rc);
        const fc = nearestWarehouse({ lat: base.lat, lng: base.lng });
        const address = await reverseGeocode(base.lat, base.lng);
        return {
          ...base,
          kind: (rc.status === "RETURN_PICKUP_SCHEDULED" ? "RETURN_PICKUP" : "VERIFY_EXCHANGE") as
            | "RETURN_PICKUP"
            | "VERIFY_EXCHANGE",
          fromLabel: address ?? "Customer address",
          toLabel: `${fc.warehouse.name} · ${fc.warehouse.city} (~${fc.distanceKm}km)`,
        };
      }),
    );

    const completed: DeliveryTask[] = completedCases.slice(0, 10).map((rc) => ({
      ...baseTask(rc),
      kind: "DROP",
      fromLabel: "—",
      toLabel: rc.status === "RETURNED_TO_SELLER" ? "Seller / FC" : "Buyer",
    }));

    return {
      pickups,
      completed,
      stats: { pickups: pickups.length, completed: completed.length },
    };
  },
};
