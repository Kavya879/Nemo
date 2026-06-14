import type { OwnershipInsightsDTO, CompatibilityResultDTO } from "@/types/dto";

/**
 * Ownership & Fit — long-term ownership economics (predicted lifespan, cost per
 * year), a purchase-regret read, and the compatibility checks. Helps the shopper
 * avoid wrong-fit and buyer's-remorse returns. All values are engine-derived.
 */

const statusMeta: Record<
  CompatibilityResultDTO["checks"][number]["status"],
  { icon: string; cls: string }
> = {
  ok: { icon: "✓", cls: "text-success" },
  review: { icon: "⚠", cls: "text-warn" },
  info: { icon: "ℹ", cls: "text-storm" },
  unknown: { icon: "?", cls: "text-storm" },
};

const regretTone: Record<OwnershipInsightsDTO["regretLevel"], string> = {
  low: "text-success",
  medium: "text-warn",
  high: "text-danger",
};

export function OwnershipFitPanel({
  ownership,
  compatibility,
}: {
  ownership: OwnershipInsightsDTO;
  compatibility: CompatibilityResultDTO;
}) {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-ink">Ownership &amp; Fit</h3>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-line p-2">
          <div className="text-lg font-bold text-ink">
            {Math.round(ownership.predictedLifespanMonths / 12) >= 2
              ? `${(ownership.predictedLifespanMonths / 12).toFixed(1)}y`
              : `${ownership.predictedLifespanMonths}mo`}
          </div>
          <div className="text-[10px] text-storm">Predicted lifespan</div>
        </div>
        <div className="rounded-md border border-line p-2">
          <div className="text-lg font-bold text-ink">
            ₹{ownership.costPerYear.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-storm">Cost / year</div>
        </div>
        <div className="rounded-md border border-line p-2">
          <div className={`text-lg font-bold ${regretTone[ownership.regretLevel]}`}>
            {ownership.regretProbability}%
          </div>
          <div className="text-[10px] text-storm">Regret risk</div>
        </div>
      </div>

      <div className="mt-3 border-t border-line pt-2">
        <p className="mb-1 text-xs font-semibold text-storm">Compatibility &amp; fit</p>
        <ul className="space-y-1">
          {compatibility.checks.map((c, i) => {
            const m = statusMeta[c.status];
            return (
              <li key={i} className="flex gap-2 text-xs text-ink">
                <span className={`font-bold ${m.cls}`}>{m.icon}</span>
                <span>
                  <span className="font-medium">{c.dimension}:</span> {c.detail}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
