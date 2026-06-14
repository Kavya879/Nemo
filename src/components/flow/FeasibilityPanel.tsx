import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { FeasibilityDTO } from "@/types/dto";
import type { Grade } from "@/types";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Displays the full Feasibility Analysis Engine output — every figure + decision. */
export function FeasibilityPanel({
  feasibility: f,
  decision,
  grade,
}: {
  feasibility: FeasibilityDTO;
  decision: "FEASIBLE" | "NOT_FEASIBLE" | null;
  grade: Grade | null;
}) {
  const costs: Array<[string, number, string?]> = [
    ["Pickup cost", f.pickupCost],
    ["Transportation cost", f.transportationCost, `${Math.round(f.distanceKm)} km to warehouse`],
    ["Warehouse handling", f.warehouseHandlingCost],
    ["Inspection cost", f.inspectionCost],
    ["Repackaging cost", f.repackagingCost],
    ["Storage cost", f.storageCost],
  ];

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold">Feasibility Analysis</span>
          {grade && <Badge tone="neutral">Grade {grade}</Badge>}
        </div>
        <Badge tone={decision === "FEASIBLE" ? "success" : "danger"}>
          {decision === "FEASIBLE" ? "RETURN FEASIBLE" : "NOT FEASIBLE → Second Life"}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Value */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-storm">Value</div>
            <Row label="Product original value" value={money(f.originalValue)} />
            <Row label="Estimated current value (after grading)" value={money(f.estimatedCurrentValue)} />
            <Row label="Expected resale value" value={money(f.expectedResaleValue)} strong />
          </div>

          {/* Costs */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-storm">Reverse-logistics cost</div>
            {costs.map(([label, value, hint]) => (
              <Row key={label} label={label} value={money(value)} hint={hint} />
            ))}
            <Row label="Total processing cost" value={money(f.totalProcessingCost)} strong />
          </div>
        </div>

        {/* Recovery */}
        <div className="rounded-lg bg-cloud p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs text-storm">Net recovery value</div>
              <div
                className={`text-2xl font-bold ${
                  f.netRecoveryValue >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {money(f.netRecoveryValue)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-storm">Recovery ratio</div>
              <div className="text-lg font-bold">{f.recoveryRatio.toFixed(2)}×</div>
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-ink">{f.reasoning}</p>
      </CardBody>
    </Card>
  );
}

function Row({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-1 text-sm last:border-0">
      <span className="text-storm">
        {label}
        {hint && <span className="ml-1 text-xs text-storm/70">({hint})</span>}
      </span>
      <span className={strong ? "font-bold text-ink" : "text-ink"}>{value}</span>
    </div>
  );
}
