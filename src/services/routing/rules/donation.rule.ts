import { type Rule } from "../types";

/**
 * Donation rule → DONATE.
 *
 * The item still works, but there's no profitable resale, no local demand, and
 * it isn't worth repairing. Rather than waste it, donate it for social good.
 */
export const donationRule: Rule = (ctx, rules) => {
  const isWorking = rules.workingGrades.includes(ctx.grade);
  if (!isWorking) return null;

  const noProfit = ctx.resaleValue <= ctx.relistingCost;
  const noDemand = ctx.nearbyDemandCount < rules.peerToPeerMinBuyers;
  const notWorthRepair = ctx.repairability < rules.repairabilityThreshold;
  if (!(noProfit && noDemand && notWorthRepair)) return null;

  const reasoning = `Item still works (Grade ${ctx.grade}) but has no profitable resale, no nearby demand, and isn't worth repairing — donate it for social good and waste avoidance.`;

  return { path: "DONATE", score: 0.55, reasoning };
};
