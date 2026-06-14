import { EARTH_RADIUS_KM, WAREHOUSES, type Warehouse } from "@/config/constants";
import type { GeoPoint } from "@/types";

/** Great-circle distance between two lat/lng points, in kilometers. Pure. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(h));
}

/** Nearest Amazon fulfillment center to an origin (drives reverse-logistics cost). */
export function nearestWarehouse(origin: GeoPoint): { warehouse: Warehouse; distanceKm: number } {
  let best = WAREHOUSES[0];
  let bestDist = haversineKm(origin, best);
  for (const w of WAREHOUSES) {
    const d = haversineKm(origin, w);
    if (d < bestDist) {
      best = w;
      bestDist = d;
    }
  }
  return { warehouse: best, distanceKm: Number(bestDist.toFixed(1)) };
}
