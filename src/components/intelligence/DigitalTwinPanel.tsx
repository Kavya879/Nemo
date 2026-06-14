import type { DigitalTwinDTO, CohortInsightDTO } from "@/types/dto";

/**
 * Pre-Purchase Digital Twin — simulates ownership for the current shopper:
 * Purchase Success Score, Satisfaction Probability, Return Probability, the key
 * risk factors, and an AI recommendation. Compact, decision-focused.
 */

const recTone: Record<string, string> = {
  "Proceed with purchase": "border-success/40 bg-success/10 text-success",
  "Proceed with caution": "border-warn/40 bg-warn/10 text-warn",
  "Reconsider this purchase": "border-danger/40 bg-danger/10 text-danger",
  "Review details — limited data": "border-storm/40 bg-mist text-storm",
};

function tone(score: number, invert = false) {
  const good = invert ? score <= 25 : score >= 70;
  const mid = invert ? score <= 50 : score >= 45;
  return good ? "text-success" : mid ? "text-warn" : "text-danger";
}

export function DigitalTwinPanel({
  twin,
  cohort,
}: {
  twin: DigitalTwinDTO;
  cohort: CohortInsightDTO;
}) {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Will this work out for you?</h3>
        <span className="text-[11px] text-storm">Digital Twin</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-line p-2">
          <div className={`text-xl font-bold ${tone(twin.purchaseSuccessScore)}`}>
            {twin.purchaseSuccessScore}%
          </div>
          <div className="text-[10px] leading-tight text-storm">Purchase success</div>
        </div>
        <div className="rounded-md border border-line p-2">
          <div className={`text-xl font-bold ${tone(twin.satisfactionProbability)}`}>
            {twin.satisfactionProbability}%
          </div>
          <div className="text-[10px] leading-tight text-storm">Satisfaction</div>
        </div>
        <div className="rounded-md border border-line p-2">
          <div className={`text-xl font-bold ${tone(twin.returnProbability, true)}`}>
            {twin.returnProbability}%
          </div>
          <div className="text-[10px] leading-tight text-storm">Return risk</div>
        </div>
      </div>

      <div
        className={`mt-3 rounded-md border px-3 py-2 text-sm font-semibold ${
          recTone[twin.recommendation] ?? "border-line bg-mist text-ink"
        }`}
      >
        {twin.recommendation}
        <span className="ml-1 text-[11px] font-normal opacity-80">
          · {Math.round(twin.confidence * 100)}% confidence
        </span>
      </div>

      {twin.riskFactors.length > 0 && (
        <ul className="mt-2 space-y-1">
          {twin.riskFactors.map((f, i) => (
            <li key={i} className="flex gap-2 text-xs text-ink">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-storm" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {cohort.confidence > 0 && (
        <p className="mt-2 border-t border-line pt-2 text-xs text-link">👥 {cohort.reason}</p>
      )}
    </div>
  );
}
