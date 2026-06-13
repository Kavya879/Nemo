import { describe, expect, it } from "vitest";
import { computeCredits } from "@/services/credits/credits.service";

const CONFIG = {
  creditsPerAction: { PEER_TO_PEER: 50, RESELL_AS_IS: 30, RECYCLE: 15 } as Record<
    string,
    number
  >,
  co2FactorsByCategory: { Footwear: 6, Electronics: 25 } as Record<string, number>,
  co2DefaultKg: 2.5,
  costSavedFactor: 0.6,
};

describe("credits.computeCredits", () => {
  it("computes credits, CO₂, and cost saved from config factors", () => {
    const r = computeCredits(
      { action: "PEER_TO_PEER", category: "Footwear", originalPrice: 4500 },
      CONFIG,
    );
    expect(r.credits).toBe(50);
    expect(r.co2SavedKg).toBe(6);
    expect(r.costSaved).toBeCloseTo(2700, 2);
  });

  it("uses the default CO₂ factor for unknown categories", () => {
    const r = computeCredits(
      { action: "RESELL_AS_IS", category: "Mystery", originalPrice: 1000 },
      CONFIG,
    );
    expect(r.co2SavedKg).toBe(2.5);
    expect(r.credits).toBe(30);
  });

  it("awards no cost-saving for RECYCLE (no avoided purchase)", () => {
    const r = computeCredits(
      { action: "RECYCLE", category: "Footwear", originalPrice: 4500 },
      CONFIG,
    );
    expect(r.costSaved).toBe(0);
    expect(r.credits).toBe(15);
  });
});
