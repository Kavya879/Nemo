import { describe, expect, it } from "vitest";
import { computePrice, type PriceBands } from "@/services/pricing/pricing.service";
import type { Grade } from "@/types";

const BANDS: PriceBands = {
  A: { min: 0.8, max: 0.9 },
  B: { min: 0.6, max: 0.75 },
  C: { min: 0.4, max: 0.55 },
  D: { min: 0.1, max: 0.25 },
};

describe("pricing.computePrice", () => {
  const grades: Grade[] = ["A", "B", "C", "D"];

  it("prices every grade within its configured band", () => {
    for (const grade of grades) {
      const res = computePrice(
        { grade, originalPrice: 1000, category: "Footwear", demandCount: 0 },
        BANDS,
        1.05,
      );
      const band = BANDS[grade];
      expect(res.pricePct).toBeGreaterThanOrEqual(band.min);
      expect(res.pricePct).toBeLessThanOrEqual(band.max);
      expect(res.price).toBe(Math.round(1000 * res.pricePct));
      expect(res.reasoning.length).toBeGreaterThan(10);
    }
  });

  it("applies a demand premium but never exceeds the band max", () => {
    const low = computePrice(
      { grade: "A", originalPrice: 1000, category: "X", demandCount: 0 },
      BANDS,
      1.05,
    );
    const high = computePrice(
      { grade: "A", originalPrice: 1000, category: "X", demandCount: 3 },
      BANDS,
      1.05,
    );
    expect(high.pricePct).toBeGreaterThan(low.pricePct);
    expect(high.pricePct).toBeLessThanOrEqual(BANDS.A.max);
    expect(high.reasoning).toMatch(/demand/i);
  });

  it("throws on a grade with no configured band", () => {
    const broken = { A: BANDS.A } as unknown as PriceBands;
    expect(() =>
      computePrice(
        { grade: "C", originalPrice: 1000, category: "X", demandCount: 0 },
        broken,
        1.05,
      ),
    ).toThrow();
  });
});
