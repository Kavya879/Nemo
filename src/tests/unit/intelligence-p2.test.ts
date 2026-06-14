import { describe, expect, it } from "vitest";
import { buildOwnershipInsights } from "@/services/intelligence/ownership";
import { checkCompatibility } from "@/services/intelligence/compatibility";

describe("ownership insights", () => {
  it("longer life + low risk → low regret and lower cost/year", () => {
    const o = buildOwnershipInsights({
      price: 12000,
      category: "Electronics",
      specs: { expectedLifespanMonths: 48, maintenanceCostPct: 0.02 },
      durability: 0.9,
      satisfaction: 0.9,
      returnProbability: 0.1,
      mismatch: 0.1,
    });
    expect(o.predictedLifespanMonths).toBeGreaterThan(48); // durability extends life
    expect(o.regretLevel).toBe("low");
    expect(o.costPerYear).toBeGreaterThan(0);
  });

  it("high return risk + dissatisfaction → high regret", () => {
    const o = buildOwnershipInsights({
      price: 3000,
      category: "Home",
      specs: {},
      durability: 0.2,
      satisfaction: 0.2,
      returnProbability: 0.8,
      mismatch: 0.7,
    });
    expect(o.regretLevel).toBe("high");
    expect(o.regretProbability).toBeGreaterThan(60);
  });

  it("falls back to a category lifespan baseline when no spec is given", () => {
    const o = buildOwnershipInsights({
      price: 1000,
      category: "Footwear",
      specs: {},
      durability: 0.5,
      satisfaction: 0.6,
      returnProbability: 0.3,
      mismatch: 0.2,
    });
    expect(o.predictedLifespanMonths).toBeGreaterThan(0);
  });
});

describe("compatibility checker", () => {
  it("confirms device compatibility from an owned matching device", () => {
    const r = checkCompatibility({
      category: "Electronics",
      specs: { compatibleWith: ["tablet", "USB-C"], requirements: "USB-C device" },
      ownedItems: [{ name: "Lumen 10 Tablet", category: "Electronics" }],
    });
    const device = r.checks.find((c) => c.dimension === "Device compatibility");
    expect(device?.status).toBe("ok");
    expect(device?.detail).toMatch(/Lumen 10 Tablet/);
  });

  it("asks the buyer to verify when no compatible device is owned", () => {
    const r = checkCompatibility({
      category: "Electronics",
      specs: { compatibleWith: ["Galaxy S series"] },
      ownedItems: [{ name: "Nimbus Running Shoes", category: "Footwear" }],
    });
    expect(r.overall).toBe("review");
    expect(r.checks[0].status).toBe("review");
  });

  it("returns unknown with no structured specs (graceful fallback)", () => {
    const r = checkCompatibility({ category: "Books", specs: {}, ownedItems: [] });
    expect(r.overall).toBe("unknown");
  });
});
