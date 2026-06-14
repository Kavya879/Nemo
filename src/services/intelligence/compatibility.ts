/**
 * Product Match & Compatibility Checker — verifies, before checkout, whether a
 * product fits the shopper: device/accessory compatibility (does the buyer own a
 * compatible device?), installation/environment requirements, and size systems.
 * Uses the product's structured specs matched against the shopper's REAL owned
 * items; when it can't confirm, it asks the buyer to verify (graceful fallback,
 * never a false "compatible").
 */

export type CompatStatus = "ok" | "review" | "info" | "unknown";

export interface CompatibilityCheck {
  dimension: string;
  status: CompatStatus;
  detail: string;
}

export interface CompatibilityResult {
  overall: "ok" | "review" | "unknown";
  checks: CompatibilityCheck[];
}

interface OwnedItemLite {
  name: string;
  category: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function checkCompatibility(input: {
  category: string;
  specs: Record<string, unknown>;
  ownedItems: OwnedItemLite[];
}): CompatibilityResult {
  const { specs, ownedItems } = input;
  const checks: CompatibilityCheck[] = [];

  const ownedText = ownedItems.map((o) => `${norm(o.name)} ${norm(o.category)}`);

  // Device / accessory compatibility.
  const compatibleWith = Array.isArray(specs.compatibleWith)
    ? (specs.compatibleWith as unknown[]).map((x) => String(x))
    : [];
  if (compatibleWith.length > 0) {
    const matched: string[] = [];
    for (const token of compatibleWith) {
      const t = norm(token);
      const owner = ownedItems.find((_, i) => t.length > 1 && ownedText[i].includes(t));
      if (owner) matched.push(owner.name);
    }
    if (matched.length > 0) {
      checks.push({
        dimension: "Device compatibility",
        status: "ok",
        detail: `Compatible with your ${[...new Set(matched)].join(", ")}.`,
      });
    } else {
      checks.push({
        dimension: "Device compatibility",
        status: "review",
        detail: `Designed for ${compatibleWith.join(", ")} — we couldn't confirm you own a compatible device. Verify before buying.`,
      });
    }
  }

  // Installation / environment requirements.
  if (typeof specs.requirements === "string" && specs.requirements) {
    checks.push({
      dimension: "Requirements",
      status: "info",
      detail: `Requires: ${specs.requirements}.`,
    });
  }

  // Size system.
  if (typeof specs.sizeSystem === "string" && specs.sizeSystem) {
    checks.push({
      dimension: "Size",
      status: "review",
      detail: `Sizes: ${specs.sizeSystem}. Sizing is a common return reason — confirm your size.`,
    });
  }

  // Physical dimensions / capacity.
  if (typeof specs.dimensions === "string" && specs.dimensions) {
    checks.push({ dimension: "Dimensions", status: "info", detail: `${specs.dimensions}.` });
  }
  if (typeof specs.capacity === "string" && specs.capacity) {
    checks.push({ dimension: "Capacity", status: "info", detail: `${specs.capacity}.` });
  }

  if (checks.length === 0) {
    return {
      overall: "unknown",
      checks: [
        {
          dimension: "Compatibility",
          status: "unknown",
          detail: "No structured specs available — check the product details to confirm fit.",
        },
      ],
    };
  }

  const overall: CompatibilityResult["overall"] = checks.some((c) => c.status === "review")
    ? "review"
    : "ok";
  return { overall, checks };
}
