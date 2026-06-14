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

  it("declares NOT_FEASIBLE when net recovery is negative", () => {
    const r = computeFeasibility(
      { grade: "D", originalValue: 3500, estimatedCurrentValue: 700, expectedResaleValue: 600, distanceKm: 228 },
      COSTS,
    );
    expect(r.netRecoveryValue).toBeLessThan(0);
    expect(r.decision).toBe("NOT_FEASIBLE");
    expect(r.reasoning).toMatch(/Second Life/i);
  });

  it("declares NOT_FEASIBLE when the recovery ratio is below threshold even if net is positive", () => {
    // Resale just above cost → positive net but recovery ratio < 1.15.
    // Costs: pickup 700 + handling 40 + inspection 35 + repackaging 37.5 (C) + storage 80 = 892.5
    const r = computeFeasibility(
      { grade: "C", originalValue: 2000, estimatedCurrentValue: 900, expectedResaleValue: 1000, distanceKm: 0 },
      { ...COSTS, pickupBaseCost: 700 },
    );
    expect(r.totalProcessingCost).toBe(892.5);
    expect(r.netRecoveryValue).toBeGreaterThan(0); // 107.5
    expect(r.recoveryRatio).toBeLessThan(1.15); // ~1.12
    expect(r.decision).toBe("NOT_FEASIBLE");
  });
});
