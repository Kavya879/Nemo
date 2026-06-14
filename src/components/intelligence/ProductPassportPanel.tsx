import type { ProductPassportDTO, PassportMetricDTO } from "@/types/dto";

/**
 * AI Product Passport — eight dynamically-computed trust metrics shown as compact
 * tiles. Each tile reflects a real signal + its confidence. Return-rate is shown
 * inverted (lower is better) but coloured on the same good→bad scale.
 */

function tone(score: number, invert = false): string {
  const good = invert ? score <= 20 : score >= 70;
  const mid = invert ? score <= 40 : score >= 45;
  return good ? "text-success" : mid ? "text-warn" : "text-danger";
}

function Tile({
  title,
  metric,
  suffix = "",
  invert = false,
}: {
  title: string;
  metric: PassportMetricDTO;
  suffix?: string;
  invert?: boolean;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className={`text-lg font-bold ${tone(metric.score, invert)}`}>
        {metric.score}
        {suffix}
      </div>
      <div className="text-[11px] font-medium text-ink">{title}</div>
      <div className="mt-0.5 text-[10px] leading-tight text-storm">
        {metric.label}
        {metric.confidence < 0.35 ? " · low confidence" : ""}
      </div>
    </div>
  );
}

export function ProductPassportPanel({ passport }: { passport: ProductPassportDTO }) {
  return (
    <div className="rounded-card border border-line bg-cloud p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">AI Product Passport</h3>
        <span className="text-[11px] text-storm">Dynamically generated</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile title="Quality" metric={passport.qualityScore} />
        <Tile title="Durability" metric={passport.durabilityPrediction} />
        <Tile title="Return rate" metric={passport.returnRate} suffix="%" invert />
        <Tile title="Seller" metric={passport.sellerReliability} />
        <Tile title="Sustainability" metric={passport.sustainabilityScore} />
        <Tile title="Satisfaction" metric={passport.customerSatisfaction} />
        <Tile title="Authenticity" metric={passport.authenticityConfidence} />
        <div className="rounded-md border border-line bg-white p-3">
          <div className="text-lg font-bold text-ink">
            ₹{passport.resaleValue.amount.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] font-medium text-ink">Resale value</div>
          <div className="mt-0.5 text-[10px] leading-tight text-storm">{passport.resaleValue.label}</div>
        </div>
      </div>
    </div>
  );
}
