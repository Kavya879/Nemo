"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { AdminCaseDetailDTO } from "@/types/dto";
import { FeasibilityPanel } from "@/components/flow/FeasibilityPanel";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/flow/States";

/** The architecture flex — full, auditable Smart Router reasoning for a return. */
export function DecisionExplorer({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<AdminCaseDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .adminCaseDetail(id)
      .then(setD)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load case"));
  }, [id]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-mist p-5 shadow-cardHover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Decision Explorer</h2>
          <button onClick={onClose} className="rounded-full bg-white px-3 py-1 text-sm hover:bg-line">
            ✕ Close
          </button>
        </div>

        {error && <ErrorState message={error} />}
        {!error && !d && <LoadingState label="Loading decision…" />}

        {d && (
          <div className="space-y-4">
            <div className="rounded bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{d.case.itemName}</div>
                  <div className="text-xs text-storm">
                    {d.case.brand ? `${d.case.brand} · ` : ""}
                    {d.case.category} · ₹{d.case.originalPrice.toLocaleString("en-IN")} · reason:{" "}
                    {d.case.reason}
                  </div>
                </div>
                <Badge tone="info">{d.case.pathLabel}</Badge>
              </div>
            </div>

            {/* Smart Router — inputs → rules that fired → final path */}
            <div className="rounded bg-white p-4">
              <h3 className="mb-2 font-bold">Smart Router reasoning</h3>
              <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                {[
                  ["Grade", d.routing.inputs.grade],
                  ["Re-listing cost", `₹${d.routing.inputs.relistingCost.toLocaleString("en-IN")}`],
                  ["Resale value", `₹${d.routing.inputs.resaleValue.toLocaleString("en-IN")}`],
                  ["Nearby buyers", `${d.routing.inputs.nearbyDemandCount}`],
                  ["Repairability", `${Math.round(d.routing.inputs.repairability * 100)}%`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded bg-cloud px-2 py-1">
                    <div className="text-xs text-storm">{k}</div>
                    <div className="font-semibold">{v}</div>
                  </div>
                ))}
              </div>

              <div className="mb-1 text-xs font-semibold uppercase text-storm">Rules that fired</div>
              <ul className="space-y-1">
                {d.routing.considered
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((c, i) => {
                    const winner = c.path === d.routing.path;
                    return (
                      <li
                        key={i}
                        className={`rounded p-2 text-sm ${winner ? "bg-success/10 ring-1 ring-success" : "bg-cloud"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {c.path.replace(/_/g, " ")} {winner && "✓ chosen"}
                          </span>
                          <span className="text-xs text-storm">score {c.score.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-storm">{c.reasoning}</p>
                      </li>
                    );
                  })}
              </ul>

              <div className="mt-3 rounded bg-squid p-3 text-white">
                <div className="text-xs text-white/70">Chosen path</div>
                <div className="text-lg font-bold text-zest">{d.routing.path.replace(/_/g, " ")}</div>
                <p className="mt-1 text-sm">{d.routing.reasoning}</p>
              </div>
            </div>

            {/* Feasibility breakdown */}
            {d.feasibility && (
              <FeasibilityPanel feasibility={d.feasibility} decision={d.case.decision} grade={d.case.grade} />
            )}

            {/* Audit trail */}
            <div className="rounded bg-white p-4">
              <h3 className="mb-2 font-bold">Audit trail</h3>
              <ol className="space-y-1 text-sm">
                {d.events.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-xs text-storm">
                      {new Date(e.createdAt).toLocaleTimeString("en-IN")}
                    </span>
                    <span className="font-semibold text-xs">{e.status}</span>
                    <span className="text-xs text-storm">{e.message}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
