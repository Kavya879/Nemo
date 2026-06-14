import { describe, expect, it } from "vitest";
import { clamp01, gradeQuality, sampleConfidence, smoothedRate } from "@/services/intelligence/types";

describe("intelligence math helpers", () => {
  it("clamp01 bounds to [0,1]", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
  });

  it("sampleConfidence rises from 0 toward 1 with sample size", () => {
    expect(sampleConfidence(0)).toBe(0);
    expect(sampleConfidence(8, 8)).toBeCloseTo(0.5, 5);
    expect(sampleConfidence(1000, 8)).toBeGreaterThan(0.99);
  });

  it("smoothedRate pulls small samples toward the prior", () => {
    // 1 return / 1 order is NOT 100% — smoothing keeps it moderate.
    const tiny = smoothedRate(1, 1, 0.15, 5);
    expect(tiny).toBeGreaterThan(0.15);
    expect(tiny).toBeLessThan(0.5);
    // With lots of data it converges to the empirical rate.
    const big = smoothedRate(200, 1000, 0.15, 5);
    expect(big).toBeCloseTo(0.2, 1);
    // No data → the prior.
    expect(smoothedRate(0, 0)).toBe(0.15);
  });

  it("gradeQuality is monotonic A>B>C>D", () => {
    expect(gradeQuality("A")).toBeGreaterThan(gradeQuality("B"));
    expect(gradeQuality("B")).toBeGreaterThan(gradeQuality("C"));
    expect(gradeQuality("C")).toBeGreaterThan(gradeQuality("D"));
  });
});
