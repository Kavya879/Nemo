import { describe, expect, it } from "vitest";
import { localDemandRule } from "@/services/routing/rules/local-demand.rule";
import { costVsValueRule } from "@/services/routing/rules/cost-vs-value.rule";
import { repairabilityRule } from "@/services/routing/rules/repairability.rule";
import { donationRule } from "@/services/routing/rules/donation.rule";
import { recycleRule } from "@/services/routing/rules/recycle.rule";
import type { RoutingContext, RoutingRules } from "@/services/routing/types";

const RULES: RoutingRules = {
  peerToPeerMinBuyers: 1,
  repairabilityThreshold: 0.5,
  workingGrades: ["A", "B", "C"],
  gradeDefaultRoutes: { A: "RESELL_AS_IS", D: "RECYCLE" },
};

function ctx(overrides: Partial<RoutingContext> = {}): RoutingContext {
  return {
    grade: "A",
    category: "Footwear",
    relistingCost: 100,
    resaleValue: 300,
    nearbyDemandCount: 0,
    repairability: 0.3,
    ...overrides,
  };
}

describe("routing rules (each in isolation)", () => {
  it("local-demand → PEER_TO_PEER when demand meets the minimum and item works", () => {
    const c = localDemandRule(ctx({ nearbyDemandCount: 3 }), RULES);
    expect(c?.path).toBe("PEER_TO_PEER");
    expect(c?.reasoning).toMatch(/buyer/i);
  });

  it("local-demand → null when no working grade or below min demand", () => {
    expect(localDemandRule(ctx({ grade: "D", nearbyDemandCount: 3 }), RULES)).toBeNull();
    expect(localDemandRule(ctx({ nearbyDemandCount: 0 }), RULES)).toBeNull();
  });

  it("cost-vs-value → RESELL_AS_IS when resale value beats re-listing cost", () => {
    const c = costVsValueRule(ctx({ grade: "A", resaleValue: 300, relistingCost: 100 }), RULES);
    expect(c?.path).toBe("RESELL_AS_IS");
  });

  it("cost-vs-value → null when re-listing costs more than resale", () => {
    expect(costVsValueRule(ctx({ resaleValue: 100, relistingCost: 200 }), RULES)).toBeNull();
  });

  it("repairability → REFURBISH when repairable enough", () => {
    const c = repairabilityRule(ctx({ grade: "B", repairability: 0.8 }), RULES);
    expect(c?.path).toBe("REFURBISH");
    expect(c?.score).toBeGreaterThan(0.7);
  });

  it("repairability → null below the threshold", () => {
    expect(repairabilityRule(ctx({ grade: "B", repairability: 0.3 }), RULES)).toBeNull();
  });

  it("donation → DONATE for a working-but-unwanted item", () => {
    const c = donationRule(
      ctx({ grade: "C", resaleValue: 50, relistingCost: 100, nearbyDemandCount: 0, repairability: 0.2 }),
      RULES,
    );
    expect(c?.path).toBe("DONATE");
  });

  it("recycle → high score for Grade D + not repairable", () => {
    const c = recycleRule(ctx({ grade: "D", repairability: 0.2 }), RULES);
    expect(c?.path).toBe("RECYCLE");
    expect(c?.score).toBeGreaterThan(0.5);
  });
});
