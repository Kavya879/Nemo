import type { VerificationAssessmentDTO } from "@/types/dto";

/**
 * Presents a pre-grade product-verification assessment: the four headline
 * scores, per-attribute match bars, the gate recommendation, and any observed
 * deviations. Pure presentation — every value comes from the assessment.
 */

const REC_META: Record<
  VerificationAssessmentDTO["recommendation"],
  { label: string; tone: string; note: string }
> = {
  PROCEED: {
    label: "Verified — match confirmed",
    tone: "border-success/40 bg-success/10 text-success",
    note: "Identity confirmed and fraud risk is low.",
  },
  REQUEST_EVIDENCE: {
    label: "More evidence needed",
    tone: "border-warn/40 bg-warn/10 text-warn",
    note: "Product match is below threshold — clearer photos required.",
  },
  MANUAL_REVIEW: {
    label: "Escalated to manual review",
    tone: "border-danger/40 bg-danger/10 text-danger",
    note: "Fraud signals detected — a human reviewer will decide.",
  },
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function Bar({ label, value }: { label: string; value: number }) {
  const tone = value >= 0.7 ? "bg-success" : value >= 0.45 ? "bg-warn" : "bg-danger";
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="capitalize text-storm">{label}</span>
        <span className="font-medium text-ink">{pct(value)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-mist">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}

function Score({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  // invert=true → higher is worse (fraud risk).
  const good = invert ? value < 0.5 : value >= 0.7;
  const mid = invert ? value < 0.7 : value >= 0.45;
  const tone = good ? "text-success" : mid ? "text-warn" : "text-danger";
  return (
    <div className="rounded-md border border-line bg-white p-3 text-center">
      <div className={`text-xl font-bold ${tone}`}>{pct(value)}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-storm">{label}</div>
    </div>
  );
}

export function VerificationPanel({
  verification,
  finalGrade,
  qualityConfidence,
}: {
  verification: VerificationAssessmentDTO;
  finalGrade?: string | null;
  qualityConfidence?: number | null;
}) {
  const meta = REC_META[verification.recommendation];
  return (
    <div className="rounded-card border border-line bg-cloud p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Product Verification</h3>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.tone}`}>
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Score label="Product Match" value={verification.productMatchConfidence} />
        <Score label="Fraud Risk" value={verification.fraudRiskScore} invert />
        {qualityConfidence != null && <Score label="Quality Confidence" value={qualityConfidence} />}
        {finalGrade && (
          <div className="rounded-md border border-line bg-white p-3 text-center">
            <div className="text-xl font-bold text-ink">{finalGrade}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-storm">Final Grade</div>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-storm">{verification.summary}</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Bar label="category" value={verification.attributes.category} />
        <Bar label="brand" value={verification.attributes.brand} />
        <Bar label="model" value={verification.attributes.model} />
        <Bar label="packaging" value={verification.attributes.packaging} />
        <Bar label="visual" value={verification.attributes.visual} />
      </div>

      {verification.deviations.length > 0 && (
        <div className="mt-3 border-t border-line pt-2">
          <p className="text-xs font-semibold text-storm">Observed deviations</p>
          <ul className="mt-1 space-y-1">
            {verification.deviations.map((d, i) => (
              <li key={i} className="text-xs text-ink">
                <span className="font-medium capitalize">{d.attribute}</span> — {d.detail}{" "}
                <span className="text-storm">({d.severity})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] text-storm">
        Verified by {verification.verifiedBy.toUpperCase()} · images: {verification.imageRoles.join(", ") || "n/a"} ·{" "}
        {verification.tookMs}ms
      </p>
    </div>
  );
}
