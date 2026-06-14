import { describe, expect, it } from "vitest";
import { combine } from "@/services/intelligence/ensemble";
import type { Signal } from "@/services/intelligence/types";

const sig = (key: string, value: number, confidence: number): Signal => ({
  key,
  value,
  confidence,
  reason: `${key} reason`,
});

describe("intelligence ensemble.combine", () => {
  it("never relies on a single signal — weights by weight × confidence", () => {
    const res = combine([
      { signal: sig("a", 0.9, 1), weight: 0.5 },
      { signal: sig("b", 0.1, 1), weight: 0.5 },
    ]);
    // Balanced high+low at full confidence → mid score, medium level.
    expect(res.score).toBeGreaterThan(35);
    expect(res.score).toBeLessThan(65);
    expect(res.level).toBe("medium");
    expect(res.signals).toHaveLength(2);
  });

  it("high-risk signals with strong confidence yield a high level", () => {
    const res = combine([
      { signal: sig("a", 0.9, 1), weight: 0.6 },
      { signal: sig("b", 0.8, 1), weight: 0.4 },
    ]);
    expect(res.level).toBe("high");
    expect(res.confidence).toBeGreaterThan(0.9);
  });

  it("shrinks toward the neutral prior when confidence is low + flags it", () => {
    const res = combine([
      { signal: sig("a", 0.95, 0.05), weight: 0.5 },
      { signal: sig("b", 0.95, 0.05), weight: 0.5 },
    ]);
    // Despite very high risk values, low confidence pulls the score toward ~40.
    expect(res.score).toBeLessThan(55);
    expect(res.confidence).toBeLessThan(0.35);
    expect(res.reasons.join(" ")).toMatch(/limited data/i);
  });

  it("falls back gracefully with zero usable evidence", () => {
    const res = combine([
      { signal: sig("a", 0.9, 0), weight: 0.5 },
      { signal: sig("b", 0.2, 0), weight: 0.5 },
    ]);
    expect(res.score).toBe(40); // neutral prior
    expect(res.confidence).toBe(0);
    expect(res.reasons.length).toBeGreaterThan(0);
  });

  it("ranks reasons by contribution and excludes zero-confidence signals", () => {
    const res = combine([
      { signal: sig("dominant", 0.9, 1), weight: 0.7 },
      { signal: sig("muted", 0.9, 0), weight: 0.3 },
    ]);
    expect(res.reasons[0]).toMatch(/dominant/);
    expect(res.reasons.join(" ")).not.toMatch(/muted/);
  });
});
