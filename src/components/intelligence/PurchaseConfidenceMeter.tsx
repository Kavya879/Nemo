import type { CartAssessmentDTO } from "@/types/dto";

/**
 * Purchase-Confidence Meter — an aggregate, checkout-time read on how confident
 * the cart is, plus concise smart warnings (duplicates, high-risk items). Driven
 * entirely by the cart-intelligence engine.
 */
export function PurchaseConfidenceMeter({ assessment }: { assessment: CartAssessmentDTO }) {
  const c = assessment.confidenceMeter;
  const tone = c >= 70 ? "success" : c >= 45 ? "warn" : "danger";
  const bar = tone === "success" ? "bg-success" : tone === "warn" ? "bg-warn" : "bg-danger";
  const text = tone === "success" ? "text-success" : tone === "warn" ? "text-warn" : "text-danger";

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Purchase Confidence</h3>
        <span className={`text-sm font-bold ${text}`}>{c}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${c}%` }} />
      </div>
      <ul className="mt-3 space-y-1">
        {assessment.warnings.map((w, i) => (
          <li key={i} className="flex gap-2 text-xs text-ink">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${bar}`} />
            <span>{w}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
