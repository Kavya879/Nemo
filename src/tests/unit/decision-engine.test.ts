import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUTE_SCORE_BANDS,
  routeForScore,
} from "@/config/decision-engine";

/**
 * The Circular Commerce Decision Engine's headline route comes from the
 * configurable condition-score bands. This locks in the spec's mapping:
 *  ≥90 Resell · 75–89 Refurbish · 60–74 Peer-to-Peer · 40–59 Donate · <40 Recycle.
 */
describe("decision-engine routeForScore (spec bands)", () => {
  const cases: Array<[number, string]> = [
    [100, "RESELL_AS_IS"],
    [90, "RESELL_AS_IS"],
    [89, "REFURBISH"],
    [75, "REFURBISH"],
    [74, "PEER_TO_PEER"],
    [60, "PEER_TO_PEER"],
    [59, "DONATE"],
    [40, "DONATE"],
    [39, "RECYCLE"],
    [0, "RECYCLE"],
  ];

  it.each(cases)("score %i → %s", (score, expected) => {
    expect(routeForScore(score, DEFAULT_ROUTE_SCORE_BANDS)).toBe(expected);
  });

  it("works regardless of band ordering (sorts high→low internally)", () => {
    const shuffled = [...DEFAULT_ROUTE_SCORE_BANDS].reverse();
    expect(routeForScore(92, shuffled)).toBe("RESELL_AS_IS");
    expect(routeForScore(45, shuffled)).toBe("DONATE");
  });
});
