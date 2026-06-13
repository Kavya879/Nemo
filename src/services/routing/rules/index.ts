import type { Rule } from "../types";
import { localDemandRule } from "./local-demand.rule";
import { costVsValueRule } from "./cost-vs-value.rule";
import { repairabilityRule } from "./repairability.rule";
import { donationRule } from "./donation.rule";
import { recycleRule } from "./recycle.rule";

/**
 * The ordered set of routing rules. Order is used only for deterministic
 * tie-breaking; the winner is chosen by score. Adding a new path = adding a
 * new file here (open/closed principle).
 */
export const ALL_RULES: Rule[] = [
  costVsValueRule,
  localDemandRule,
  repairabilityRule,
  donationRule,
  recycleRule,
];

export {
  localDemandRule,
  costVsValueRule,
  repairabilityRule,
  donationRule,
  recycleRule,
};
