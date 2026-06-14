"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { AdminPreventionDTO } from "@/types/dto";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/flow/States";

export function PreventionInsights() {
  const [data, setData] = useState<AdminPreventionDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient.adminPrevention().then(setData).catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <LoadingState label="Loading insights…" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Prevention Insights</h2>
        <p className="text-sm text-storm">
          Patterns the system learned from returns → the nudges it now serves to prevent the next one.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.map((p) => {
          const max = Math.max(...p.reasons.map((r) => r.count), 1);
          return (
            <div key={p.category} className="rounded border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{p.category}</h3>
                <Badge tone="info">{p.sampleSize} returns</Badge>
              </div>
              <p className="mt-1 text-sm">
                Top reason: <span className="font-semibold">{p.topReason}</span> ({p.topPct}%)
              </p>
              <div className="mt-2 space-y-1">
                {p.reasons.map((r) => (
                  <div key={r.reason} className="flex items-center gap-2 text-xs">
                    <span className="w-36 shrink-0 truncate text-storm">{r.reason}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded bg-mist">
                      <div className="h-full bg-warn" style={{ width: `${(r.count / max) * 100}%` }} />
                    </div>
                    <span className="w-6 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded bg-link/5 p-2 text-xs text-link">💡 {p.nudge}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
