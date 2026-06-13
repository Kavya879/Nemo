import { inr, type Rule } from "../types";

/**
 * Local-demand rule → PEER_TO_PEER.
 *
 * If enough nearby verified buyers want this category and the item still works,
 * a direct peer-to-peer sale is attractive — especially when re-listing it for
 * resale would cost more than it's worth.
 */
export const localDemandRule: Rule = (ctx, rules) => {
  const isWorking = rules.workingGrades.includes(ctx.grade);
  if (!isWorking) return null;
  if (ctx.nearbyDemandCount < rules.peerToPeerMinBuyers) return null;

  const relistNotWorth = ctx.relistingCost >= ctx.resaleValue;
  const demandBonus = Math.min(ctx.nearbyDemandCount * 0.02, 0.1);
  const score = 0.65 + (relistNotWorth ? 0.2 : 0) + demandBonus;

  const reasoning = relistNotWorth
    ? `${ctx.nearbyDemandCount} verified buyer(s) nearby want this, and re-listing cost (${inr(
        ctx.relistingCost,
      )}) ≥ resale value (${inr(
        ctx.resaleValue,
      )}) — a direct peer-to-peer sale captures the most value.`
    : `${ctx.nearbyDemandCount} verified buyer(s) nearby want this — a peer-to-peer match is fast and avoids re-listing overhead.`;

  return { path: "PEER_TO_PEER", score: Math.min(score, 0.99), reasoning };
};
