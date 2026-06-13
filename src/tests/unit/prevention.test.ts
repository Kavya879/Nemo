import { describe, expect, it } from "vitest";
import { buildGuidance } from "@/services/prevention/prevention.service";

describe("prevention.buildGuidance", () => {
  it("personalizes sizing guidance using the shopper profile", () => {
    const res = buildGuidance(
      ["Size too small", "Size too small", "Color not as pictured"],
      { footProfile: "wide", preferredSize: "8" },
      0.7,
    );
    expect(res.topReason).toBe("Size too small");
    expect(res.message).toMatch(/size 8/i);
    expect(res.message).toMatch(/wide/i);
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.sampleSize).toBe(3);
  });

  it("falls back to generic sizing advice without a profile", () => {
    const res = buildGuidance(["Wrong fit", "too small"], undefined, 0.7);
    expect(res.message).toMatch(/siz/i);
    expect(res.confidence).toBeLessThanOrEqual(0.99);
  });

  it("returns a low-confidence default when there's no history", () => {
    const res = buildGuidance([], undefined, 0.7);
    expect(res.topReason).toBeNull();
    expect(res.sampleSize).toBe(0);
    expect(res.confidence).toBeLessThan(0.7);
  });
});
