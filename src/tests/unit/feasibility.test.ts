import { describe, expect, it } from "vitest";
import {
  computeFeasibility,
  type FeasibilityCostModel,
} from "@/services/feasibility/feasibility.service";

const COSTS: FeasibilityCostModel = {
  pickupBaseCost: 80,
  transportCostPerKm: 3,
  warehouseHandlingCost: 40,
  inspectionCost: 35,
  repackagingBaseCost: 25,
  storageCostPerDay: 8,
  estimatedStorageDays: 10,
  minNetRecoveryValue: 0,
  feasibilityRatio: 1.15,
  warehouseProximityKm: 50,
};

describe("feasibility engine — computeFeasibility", () => {
  it("computes every cost line and totals them correctly", () => {
    const r = computeFeasibility(
      {
        grade: "A",
        originalValue: 4500,
        estimatedCurrentValue: 3825,
        expectedResaleValue: 3800,
        distanceKm: 200,
      },
      COSTS,
    );
    expect(r.pickupCost).toBe(80);
    expect(r.transportationCost).toBe(600); // 200km * 3
    expect(r.warehouseHandlingCost).toBe(40);
    expect(r.inspectionCost).toBe(35);
    expect(r.repackagingCost).toBe(25); // grade A multiplier 1
    expect(r.storageCost).toBe(80); // 8 * 10
    expect(r.totalProcessingCost).toBe(860);
    expect(r.netRecoveryValue).toBe(2940); // 3800 - 860
    expect(r.decision).toBe("FEASIBLE");
  });

  it("scales repackaging cost up for worse grades", () => {
    const d = computeFeasibility(
      { grade: "D", originalValue: 1000, estimatedCurrentValue: 200, expectedResaleValue: 250, distanceKm: 0 },
      COSTS,
    );
    expect(d.repackagingCost).toBe(50); // 25 * 2 (grade D)
  });

  it("declares NOT_FEASIBLE when far from an FC and net recovery is negative", () => {
    const r = computeFeasibility(
      { grade: "D", originalValue: 3500, estimatedCurrentValue: 700, expectedResaleValue: 600, distanceKm: 228 },
      COSTS,
    );
    expect(r.proximityFeasible).toBe(false);
    expect(r.netRecoveryValue).toBeLessThan(0);
    expect(r.decision).toBe("NOT_FEASIBLE");
    expect(r.reasoning).toMatch(/Second Life/i);
  });

  it("declares NOT_FEASIBLE when far + positive net but ratio below threshold", () => {
    // Far (300km) so proximity doesn't apply; resale just above cost → ratio < 1.15.
    const r = computeFeasibility(
      { grade: "C", originalValue: 2000, estimatedCurrentValue: 900, expectedResaleValue: 1300, distanceKm: 300 },
      COSTS,
    );
    expect(r.proximityFeasible).toBe(false);
    expect(r.netRecoveryValue).toBeGreaterThan(0);
    expect(r.recoveryRatio).toBeLessThan(1.15);
    expect(r.decision).toBe("NOT_FEASIBLE");
  });

  it("#2: near an FC ⇒ FEASIBLE (normal return) even when economics are poor", () => {
    const r = computeFeasibility(
      { grade: "D", originalValue: 1000, estimatedCurrentValue: 200, expectedResaleValue: 120, distanceKm: 10 },
      COSTS,
    );
    expect(r.proximityFeasible).toBe(true);
    expect(r.decision).toBe("FEASIBLE");
    expect(r.reasoning).toMatch(/normal channel/i);
  });
});
