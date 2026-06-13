import { beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { isDbAvailable } from "@/tests/helpers/db-available";

/**
 * Phase 5 verification:
 *  - every API route responds correctly to VALID input (+ right status),
 *  - every API route returns a clean 400 on INVALID input (no crash),
 *  - the FULL backend journey runs through the API alone:
 *    return → grade → route → price → list → match → credits → prevention.
 *
 * The grader's Transformers.js dependency is mocked so grading is fast/offline.
 * Requires the docker stack (DB + Redis) running.
 */

// Mock the offline classifier so /api/grade never downloads a model.
vi.mock("@xenova/transformers", () => ({
  pipeline: async () => async () => [{ label: "tablet", score: 0.92 }],
  RawImage: { fromBlob: async () => ({}) },
}));

// Helpers to call route handlers directly.
function jsonReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function getReq(url: string): Request {
  return new Request(url, { method: "GET" });
}

const ITEM_ID = "demo-item-tablet"; // Electronics, ₹15000, no pre-existing listing
const ORIGIN = { lat: 12.9716, lng: 77.5946 };

describe("phase 5 — full API layer", () => {
  let up = false;
  beforeAll(async () => {
    up = await isDbAvailable();
    if (!up) {
      console.warn("⚠ Skipping API flow tests — no live DB.");
      return;
    }
    // Reset the test item so the flow is idempotent across runs.
    await prisma.listing.deleteMany({ where: { itemId: ITEM_ID } });
    await prisma.routingDecision.deleteMany({ where: { itemId: ITEM_ID } });
    await prisma.gradeResult.deleteMany({ where: { itemId: ITEM_ID } });
    await prisma.return.deleteMany({ where: { itemId: ITEM_ID } });
    await prisma.item.update({ where: { id: ITEM_ID }, data: { status: "GRADED" } });
  });

  it("rejects invalid input with a clean 400 (every route)", async () => {
    if (!up) return;
    const cases: Array<[Promise<Response>, string]> = [];

    const { POST: gradePOST } = await import("@/app/api/grade/route");
    cases.push([gradePOST(jsonReq("http://t/api/grade", { images: [] })), "grade"]);

    const { POST: routePOST } = await import("@/app/api/route-item/route");
    cases.push([routePOST(jsonReq("http://t/api/route-item", { context: {} })), "route-item"]);

    const { POST: listPOST } = await import("@/app/api/listings/route");
    cases.push([listPOST(jsonReq("http://t/api/listings", { itemId: "" })), "listings"]);

    const { POST: pricePOST } = await import("@/app/api/pricing/route");
    cases.push([pricePOST(jsonReq("http://t/api/pricing", { grade: "Z" })), "pricing"]);

    const { GET: matchGET } = await import("@/app/api/match/route");
    cases.push([matchGET(getReq("http://t/api/match?category=X")), "match (missing coords)"]);

    const { GET: prevGET } = await import("@/app/api/prevention/route");
    cases.push([prevGET(getReq("http://t/api/prevention")), "prevention (missing category)"]);

    const { POST: creditsPOST } = await import("@/app/api/credits/route");
    cases.push([creditsPOST(jsonReq("http://t/api/credits", { action: "NOPE" })), "credits"]);

    const { POST: returnsPOST } = await import("@/app/api/returns/route");
    cases.push([returnsPOST(jsonReq("http://t/api/returns", {})), "returns"]);

    for (const [p, label] of cases) {
      const res = await p;
      expect(res.status, `${label} should 400`).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("runs the entire journey through the API and returns connected data", async () => {
    if (!up) return;

    // 1) Return
    const { POST: returnsPOST } = await import("@/app/api/returns/route");
    const retRes = await returnsPOST(
      jsonReq("http://t/api/returns", {
        itemId: ITEM_ID,
        reason: "Changed my mind",
        photos: ["photo1.jpg"],
      }),
    );
    expect(retRes.status).toBe(201);

    // 2) Grade
    const { POST: gradePOST } = await import("@/app/api/grade/route");
    const gradeRes = await gradePOST(
      jsonReq("http://t/api/grade", {
        itemId: ITEM_ID,
        images: [{ base64: "QUJD", mimeType: "image/jpeg" }],
      }),
    );
    expect(gradeRes.status).toBe(200);
    const grade = (await gradeRes.json()).data;
    expect(["A", "B", "C", "D"]).toContain(grade.grade);
    expect(grade.tookMs).toBeGreaterThanOrEqual(0);

    // 3) Route
    const { POST: routePOST } = await import("@/app/api/route-item/route");
    const routeRes = await routePOST(
      jsonReq("http://t/api/route-item", {
        itemId: ITEM_ID,
        context: {
          grade: grade.grade,
          category: "Electronics",
          relistingCost: 500,
          resaleValue: 9000,
          nearbyDemandCount: 2,
          repairability: 0.7,
        },
      }),
    );
    expect(routeRes.status).toBe(200);
    const decision = (await routeRes.json()).data;
    expect(decision.reasoning.length).toBeGreaterThan(10);

    // 4) Price
    const { POST: pricePOST } = await import("@/app/api/pricing/route");
    const priceRes = await pricePOST(
      jsonReq("http://t/api/pricing", {
        grade: grade.grade,
        originalPrice: 15000,
        category: "Electronics",
        demandCount: 2,
      }),
    );
    expect(priceRes.status).toBe(200);
    const price = (await priceRes.json()).data;
    expect(price.price).toBeGreaterThan(0);

    // 5) List
    const { POST: listPOST } = await import("@/app/api/listings/route");
    const listRes = await listPOST(
      jsonReq("http://t/api/listings", {
        itemId: ITEM_ID,
        grade: grade.grade,
        confidence: grade.confidence,
        flaws: grade.flaws,
        price: price.price,
        pricePct: price.pricePct,
        history: ["Returned: changed my mind"],
      }),
    );
    expect(listRes.status).toBe(201);
    const listing = (await listRes.json()).data;
    expect(listing.healthCard.verifiedCondition).toBe(grade.grade);

    // 6) Match
    const { GET: matchGET } = await import("@/app/api/match/route");
    const matchRes = await matchGET(
      getReq(`http://t/api/match?category=Electronics&lat=${ORIGIN.lat}&lng=${ORIGIN.lng}`),
    );
    expect(matchRes.status).toBe(200);
    const match = (await matchRes.json()).data;
    expect(match).toHaveProperty("count");

    // 7) Credits
    const { POST: creditsPOST } = await import("@/app/api/credits/route");
    const creditsRes = await creditsPOST(
      jsonReq("http://t/api/credits", {
        action: decision.path,
        category: "Electronics",
        originalPrice: 15000,
        itemId: ITEM_ID,
      }),
    );
    expect(creditsRes.status).toBe(201);
    const credits = (await creditsRes.json()).data;
    expect(credits.credits).toBeGreaterThan(0);
    expect(credits.totals.totalCredits).toBeGreaterThanOrEqual(credits.credits);

    // 8) Prevention
    const { GET: prevGET } = await import("@/app/api/prevention/route");
    const prevRes = await prevGET(getReq("http://t/api/prevention?category=Footwear"));
    expect(prevRes.status).toBe(200);
    const prevention = (await prevRes.json()).data;
    expect(prevention.message.length).toBeGreaterThan(10);
  });
});
