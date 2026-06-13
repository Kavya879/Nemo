import { beforeAll, describe, expect, it } from "vitest";
import { pricingService } from "@/services/pricing/pricing.service";
import { listingService } from "@/services/listing/listing.service";
import { matchingService } from "@/services/matching/matching.service";
import { routingService } from "@/services/routing/routing.service";
import { ListingDraftSchema } from "@/types";
import { isDbAvailable } from "@/tests/helpers/db-available";

/**
 * Phase 4 chained integration: a graded item → routed → priced → listed →
 * matched, end to end, against the seeded demo data + live Redis.
 * Requires the docker stack (DB + Upstash-compatible Redis) running.
 */
describe("phase 4 — priced → listed → matched chain", () => {
  let up = false;
  beforeAll(async () => {
    up = await isDbAvailable();
    if (!up) console.warn("⚠ Skipping phase4 chain — no live DB.");
  });

  // demo-item-sneakers: Footwear, originalPrice 4500, grade A, repairability 0.4
  const ITEM_ID = "demo-item-sneakers";
  const ORIGIN = { lat: 12.9716, lng: 77.5946 }; // seed center

  it("routes the item with a reasoning string", async () => {
    if (!up) return;
    const decision = await routingService.route({
      itemId: ITEM_ID,
      context: {
        grade: "A",
        category: "Footwear",
        relistingCost: 200,
        resaleValue: 3800,
        nearbyDemandCount: 2,
        repairability: 0.4,
      },
    });
    expect(["RESELL_AS_IS", "PEER_TO_PEER"]).toContain(decision.path);
    expect(decision.reasoning.length).toBeGreaterThan(10);
  });

  it("prices the item within its grade band with reasoning", async () => {
    if (!up) return;
    const price = await pricingService.price({
      grade: "A",
      originalPrice: 4500,
      category: "Footwear",
      demandCount: 2,
    });
    expect(price.price).toBeGreaterThan(0.8 * 4500 - 1);
    expect(price.price).toBeLessThanOrEqual(0.9 * 4500 + 1);
    expect(price.reasoning).toBeTruthy();
  });

  it("builds a complete, valid listing with a Product Health Card", async () => {
    if (!up) return;
    const draft = await listingService.buildDraft({
      itemId: ITEM_ID,
      grade: "A",
      confidence: 0.94,
      flaws: [{ type: "sole-wear", severity: "minor", location: "outsole" }],
      price: 3825,
      pricePct: 0.85,
      history: ["Returned: size too small"],
    });
    expect(ListingDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.title).toContain("Grade A");
    expect(draft.description.length).toBeGreaterThan(10);
    expect(draft.healthCard.verifiedCondition).toBe("A");
    expect(draft.healthCard.warranty).toBeTruthy();
    expect(draft.healthCard.history.length).toBeGreaterThan(0);
  });

  it("matches nearby buyers within the configured radius, ranked", async () => {
    if (!up) return;
    const matches = await matchingService.findNearby({
      category: "Footwear",
      origin: ORIGIN,
    });
    // Seeded Footwear buyers: 2km, 3.5km within 5km; 8km out of range.
    expect(matches.length).toBeGreaterThanOrEqual(2);
    for (const m of matches) expect(m.distanceKm).toBeLessThanOrEqual(5);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].distanceKm).toBeGreaterThanOrEqual(matches[i - 1].distanceKm);
    }
  });
});
