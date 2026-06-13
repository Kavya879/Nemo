import { beforeAll, describe, expect, it } from "vitest";
import { isDbAvailable } from "@/tests/helpers/db-available";

/**
 * Orders + rewards endpoints:
 *  - /api/orders annotates each order with return eligibility,
 *  - an expired order cannot be returned (409),
 *  - /api/rewards lists the catalog,
 *  - /api/credits/redeem deducts from balance (and 409s when short).
 * Requires the docker stack + seed.
 */
function getReq(url: string): Request {
  return new Request(url, { method: "GET" });
}
function jsonReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("orders + rewards", () => {
  let up = false;
  beforeAll(async () => {
    up = await isDbAvailable();
    if (!up) console.warn("⚠ Skipping orders/rewards — no live DB.");
  });

  it("lists orders with eligibility and includes both eligible + expired", async () => {
    if (!up) return;
    const { GET } = await import("@/app/api/orders/route");
    const res = await GET(getReq("http://t/api/orders"));
    expect(res.status).toBe(200);
    const orders = (await res.json()).data as Array<{
      returnEligible: boolean;
      reasonIfNot?: string;
    }>;
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.some((o) => o.returnEligible)).toBe(true);
    expect(orders.some((o) => !o.returnEligible)).toBe(true);
  });

  it("blocks returning an expired order with a 409", async () => {
    if (!up) return;
    const { POST } = await import("@/app/api/returns/route");
    // demo-item-jacket was seeded delivered 45 days ago (window 30) → expired.
    const res = await POST(
      jsonReq("http://t/api/returns", {
        itemId: "demo-item-jacket",
        reason: "Changed my mind",
        photos: [],
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("lists the reward catalog", async () => {
    if (!up) return;
    const { GET } = await import("@/app/api/rewards/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const rewards = (await res.json()).data as Array<{ id: string; cost: number }>;
    expect(rewards.length).toBeGreaterThan(0);
  });

  it("redeems a reward and reduces the available balance", async () => {
    if (!up) return;
    // Earn enough credits first.
    const { POST: creditsPOST } = await import("@/app/api/credits/route");
    await creditsPOST(
      jsonReq("http://t/api/credits", {
        action: "PEER_TO_PEER",
        category: "Footwear",
        originalPrice: 4500,
      }),
    );

    const { GET: creditsGET } = await import("@/app/api/credits/route");
    const before = (await (await creditsGET(getReq("http://t/api/credits"))).json()).data
      .availableBalance as number;

    const { POST: redeemPOST } = await import("@/app/api/credits/redeem/route");
    const res = await redeemPOST(
      jsonReq("http://t/api/credits/redeem", { rewardId: "plant-tree" }),
    );
    expect(res.status).toBe(201);
    const result = (await res.json()).data;
    expect(result.totals.availableBalance).toBe(before - 80);
  });

  it("rejects an unknown reward (404)", async () => {
    if (!up) return;
    const { POST } = await import("@/app/api/credits/redeem/route");
    const res = await POST(jsonReq("http://t/api/credits/redeem", { rewardId: "nope" }));
    expect(res.status).toBe(404);
  });
});
