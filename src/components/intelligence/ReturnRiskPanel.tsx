import type { ReturnRiskDTO } from "@/types/dto";

/**
 * Return Risk Score panel — the ensemble AI assessment for a product. Concise,
 * Amazon-style: a level pill + score, the top contributing reasons, and a
 * confidence note. All values come from the engine (nothing hardcoded).
 */

const META: Record<ReturnRiskDTO["level"], { label: string; tone: string; bar: string }> = {
  low: { label: "Low return risk", tone: "border-success/40 bg-success/10 text-success", bar: "bg-success" },
  medium: { label: "Medium return risk", tone: "border-warn/40 bg-warn/10 text-warn", bar: "bg-warn" },
  high: { label: "High return risk", tone: "border-danger/40 bg-danger/10 text-danger", bar: "bg-danger" },
};

export function ReturnRiskPanel({ risk }: { risk: ReturnRiskDTO }) {
  const m = META[risk.level];
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">AI Return Risk</h3>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.tone}`}>
          {m.label}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-ink">{risk.score}</div>
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
            <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${risk.score}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-storm">
            Confidence {Math.round(risk.confidence * 100)}% · ensemble of history, reviews, seller,
            defects {risk.confidence < 0.35 ? "· limited data" : ""}
          </div>
        </div>
      </div>

      {risk.reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {risk.reasons.map((r, i) => (
            <li key={i} className="flex gap-2 text-xs text-ink">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-storm" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
