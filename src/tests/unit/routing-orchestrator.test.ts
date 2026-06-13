import { describe, expect, it } from "vitest";
import { decideWith } from "@/services/routing/routing.service";
import type { RoutingContext, RoutingRules } from "@/services/routing/types";

const RULES: RoutingRules = {
  peerToPeerMinBuyers: 1,
  repairabilityThreshold: 0.5,
  workingGrades: ["A", "B", "C"],
  gradeDefaultRoutes: { A: "RESELL_AS_IS", D: "RECYCLE" },
};

function ctx(o: Partial<RoutingContext> = {}): RoutingContext {
  return {
    grade: "A",
    category: "Footwear",
    relistingCost: 100,
    resaleValue: 300,
    nearbyDemandCount: 0,
    repairability: 0.3,
    ...o,
  };
}

describe("routing orchestrator — full scenarios", () => {
  it("Grade A + cheap (relist ≥ resale) + local demand → PEER_TO_PEER", () => {
    const r = decideWith(
      ctx({ grade: "A", relistingCost: 180, resaleValue: 150, nearbyDemandCount: 3 }),
      RULES,
    );
    expect(r.path).toBe("PEER_TO_PEER");
    expect(r.reasoning).toMatch(/buyer/i);
  });

  it("Grade D + not repairable → RECYCLE", () => {
    const r = decideWith(ctx({ grade: "D", repairability: 0.2, nearbyDemandCount: 0 }), RULES);
    expect(r.path).toBe("RECYCLE");
  });

  it("Grade B + repairable + no local demand + not worth reselling → REFURBISH", () => {
    const r = decideWith(
      ctx({ grade: "B", repairability: 0.85, nearbyDemandCount: 0, resaleValue: 120, relistingCost: 150 }),
      RULES,
    );
    expect(r.path).toBe("REFURBISH");
  });

  it("Working but unwanted (no profit, no demand, not repairable) → DONATE", () => {
    const r = decideWith(
      ctx({ grade: "C", resaleValue: 40, relistingCost: 120, nearbyDemandCount: 0, repairability: 0.2 }),
      RULES,
    );
    expect(r.path).toBe("DONATE");
  });

  it("Grade A profitable resale, no demand → RESELL_AS_IS", () => {
    const r = decideWith(
      ctx({ grade: "A", resaleValue: 400, relistingCost: 100, nearbyDemandCount: 0 }),
      RULES,
    );
    expect(r.path).toBe("RESELL_AS_IS");
  });

  it("always produces a reasoning string and considered candidates", () => {
    const r = decideWith(ctx(), RULES);
    expect(r.reasoning.length).toBeGreaterThan(10);
    expect(r.considered.length).toBeGreaterThan(0);
  });

  it("is config-driven: raising peerToPeerMinBuyers flips PEER_TO_PEER → DONATE", () => {
    const scenario = ctx({
      grade: "A",
      relistingCost: 180,
      resaleValue: 150,
      nearbyDemandCount: 3,
      repairability: 0.2,
    });
    const before = decideWith(scenario, RULES);
    expect(before.path).toBe("PEER_TO_PEER");

    const stricter: RoutingRules = { ...RULES, peerToPeerMinBuyers: 5 };
    const after = decideWith(scenario, stricter);
    expect(after.path).toBe("DONATE");
    expect(after.path).not.toBe(before.path);
  });
});
