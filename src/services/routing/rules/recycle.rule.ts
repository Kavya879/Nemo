import { type Rule } from "../types";

/**
 * Recycle rule → RECYCLE.
 *
 * The safety net. Always returns a candidate so the engine never has zero
 * options. Scores high only when the item is genuinely end-of-life: Grade D
 * and not worth repairing.
 */
export const recycleRule: Rule = (ctx, rules) => {
  const notWorthRepair = ctx.repairability < rules.repairabilityThreshold;

  let score = 0.05; // low baseline fallback
  let reasoning =
    "No stronger path applies; recycle responsibly to recover materials.";

  if (ctx.grade === "D" && notWorthRepair) {
    score = 0.7;
    reasoning = `Grade D with low repairability (${ctx.repairability.toFixed(
      2,
    )} < threshold ${rules.repairabilityThreshold.toFixed(
      2,
    )}) — no viable resale or repair path, so recycle responsibly.`;
  } else if (ctx.grade === "D") {
    score = 0.4;
    reasoning =
      "Grade D: not resellable as-is; recycle unless refurbishment is viable.";
  }

  return { path: "RECYCLE", score, reasoning };
};
