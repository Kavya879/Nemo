import { describe, expect, it } from "vitest";
import { rankWithinRadius } from "@/services/matching/matching.service";
import type { GeoPoint } from "@/types";

const ORIGIN: GeoPoint = { lat: 12.9716, lng: 77.5946 };
const degPerKm = 0.009;
const north = (km: number) => ({
  id: `b${km}`,
  name: `${km}km`,
  lat: ORIGIN.lat + km * degPerKm,
  lng: ORIGIN.lng,
});

describe("matching.rankWithinRadius", () => {
  const buyers = [north(1), north(2), north(4.5), north(8)];

  it("returns only buyers within the radius, ranked nearest-first", () => {
    const matches = rankWithinRadius(ORIGIN, buyers, 5);
    expect(matches.map((m) => m.name)).toEqual(["1km", "2km", "4.5km"]);
    // sorted ascending by distance
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].distanceKm).toBeGreaterThanOrEqual(matches[i - 1].distanceKm);
    }
  });

  it("changing the radius changes the result set (config-driven)", () => {
    const wide = rankWithinRadius(ORIGIN, buyers, 10);
    const narrow = rankWithinRadius(ORIGIN, buyers, 1.5);
    expect(wide.length).toBe(4);
    expect(narrow.length).toBe(1);
    expect(narrow[0].name).toBe("1km");
  });

  it("returns empty when nobody is in range", () => {
    expect(rankWithinRadius(ORIGIN, buyers, 0.1)).toHaveLength(0);
  });
});
