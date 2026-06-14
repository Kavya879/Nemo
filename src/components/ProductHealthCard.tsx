import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GradeBadge } from "@/components/GradeBadge";
import type { ProductHealthCard as HealthCard } from "@/types";

const SEVERITY_TONE = {
  minor: "neutral",
  moderate: "warn",
  severe: "danger",
} as const;

/**
 * The trust layer, on display. Shows verified condition, confidence, flaws,
 * provenance history, and warranty — so a buyer can feel safe.
 */
export function ProductHealthCard({ card }: { card: HealthCard }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GradeBadge grade={card.verifiedCondition} />
          <div>
            <p className="text-sm font-semibold text-ink">Product Health Card</p>
            <p className="text-xs text-storm">Amazon Nemo-verified condition</p>
          </div>
        </div>
        <Badge tone="success">{Math.round(card.confidence * 100)}% confidence</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-storm">
            Detected condition
          </p>
          {card.flaws.length === 0 ? (
            <Badge tone="success">No significant flaws</Badge>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {card.flaws.map((f, i) => (
                <li key={i}>
                  <Badge tone={SEVERITY_TONE[f.severity]}>
                    {f.severity} {f.type} · {f.location}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-storm">
            History
          </p>
          <ol className="space-y-1 text-sm text-ink">
            {card.history.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-link" />
                {h}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-cloud px-3 py-2">
          <span className="text-sm font-medium text-ink">Warranty:</span>
          <span className="text-sm text-storm">{card.warranty}</span>
        </div>
      </CardBody>
    </Card>
  );
}
