"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { PurchaseAdvisorDTO } from "@/types/dto";

/**
 * Personalized AI Purchase Advisor — a dashboard summary of the shopper's return
 * behaviour (orders/returns, risk profile, top reasons) and concrete
 * recommendations, all learned from their real history.
 */
const profileTone: Record<PurchaseAdvisorDTO["riskProfile"], string> = {
  low: "border-success/40 bg-success/10 text-success",
  medium: "border-warn/40 bg-warn/10 text-warn",
  high: "border-danger/40 bg-danger/10 text-danger",
};

export function PurchaseAdvisorCard() {
  const [advisor, setAdvisor] = useState<PurchaseAdvisorDTO | null>(null);

  useEffect(() => {
    apiClient.getPurchaseAdvisor().then(setAdvisor).catch(() => setAdvisor(null));
  }, []);

  if (!advisor) return null;

  return (
    <div className="mt-4 rounded-card border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">🧠 AI Purchase Advisor</h2>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${profileTone[advisor.riskProfile]}`}>
          {advisor.riskProfile} returner
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-line p-2">
          <div className="text-xl font-bold text-ink">{advisor.ordersCount}</div>
          <div className="text-[10px] text-storm">Orders</div>
        </div>
        <div className="rounded-md border border-line p-2">
          <div className="text-xl font-bold text-ink">{advisor.returnsCount}</div>
          <div className="text-[10px] text-storm">Returns</div>
        </div>
        <div className="rounded-md border border-line p-2">
          <div className="text-xl font-bold text-ink">{Math.round(advisor.returnRate * 100)}%</div>
          <div className="text-[10px] text-storm">Return rate</div>
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {advisor.recommendations.map((r, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-link" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {advisor.topReasons.length > 0 && (
        <p className="mt-2 text-xs text-storm">
          Top return reasons: {advisor.topReasons.map((r) => `${r.reason} (${r.count})`).join(" · ")}
        </p>
      )}
      {advisor.confidence < 0.35 && (
        <p className="mt-1 text-[11px] text-storm">Sharpens as you shop and return more.</p>
      )}
    </div>
  );
}
