"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { AdminCaseDetailDTO, CircularDecisionDTO, RouteDTO } from "@/types/dto";
import { FeasibilityPanel } from "@/components/flow/FeasibilityPanel";
import { OriginalVsReturn } from "@/components/ReturnPhotos";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/flow/States";

const CONF_TONE = { High: "success", Medium: "warn", Low: "danger" } as const;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** The architecture flex — full, auditable Smart Router reasoning for a return. */
export function DecisionExplorer({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<AdminCaseDetailDTO | null>(null);
  const [decision, setDecision] = useState<CircularDecisionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [chosenRoute, setChosenRoute] = useState<RouteDTO | "">("");
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    apiClient
      .adminCaseDetail(id)
      .then((detail) => {
        setD(detail);
        // If the case has a grade, fetch the Decision Engine recommendation
        if (detail.case.grade) {
          apiClient.getDecision(id).then(setDecision).catch(() => undefined);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load case"));
  }, [id]);

  const isRoutingEscalation = d?.case.status === "MANUAL_REVIEW" && d?.case.grade != null;

  async function resolveRoute(route: RouteDTO) {
    setActionBusy(true);
    setActionError(null);
    try {
      await apiClient.chooseRoute(id, route, {
        overridden: route !== decision?.recommendedRoute,
        reason: `Admin resolved routing escalation → ${route.replace(/_/g, " ")}`,
      });
      setResolved(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to apply route");
    } finally {
      setActionBusy(false);
    }
  }

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

            {/* Submitted return photos vs the original product */}
            {(d.case.returnPhotos?.length > 0 || d.case.imageUrl) && (
              <div className="rounded bg-white p-4">
                <h3 className="mb-2 font-bold">Return photos</h3>
                {(d.case.productMatchConfidence != null || d.case.fraudRiskScore != null) && (
                  <p className="mb-2 text-xs text-storm">
                    {d.case.productMatchConfidence != null &&
                      `Product match ${Math.round(d.case.productMatchConfidence * 100)}%`}
                    {d.case.fraudRiskScore != null &&
                      ` · fraud risk ${Math.round(d.case.fraudRiskScore * 100)}%`}
                  </p>
                )}
                <OriginalVsReturn
                  originalImageUrl={d.case.imageUrl}
                  category={d.case.category}
                  photos={d.case.returnPhotos ?? []}
                />
              </div>
            )}

            {/* Smart Router — fallback when Circular Decision Engine is not available */}
            {!decision && (
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
            )}

            {/* Circular Decision Engine recommendation (primary — shown for graded cases) */}
            {decision && (
              <div className="rounded bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">⚡ Circular Decision Engine</h3>
                  <Badge tone={CONF_TONE[decision.confidenceBand]}>
                    {decision.confidenceBand} · {Math.round(decision.confidence * 100)}%
                  </Badge>
                </div>
                <div className="mt-2 rounded bg-ember/5 p-3">
                  <div className="flex items-center gap-2 text-lg font-bold">
                    <span>{decision.recommendedIcon}</span>
                    <span>{decision.recommendedLabel}</span>
                  </div>
                  <p className="mt-1 text-sm text-storm">{decision.reasoning}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded border border-line p-2 text-center">
                    <div className="font-bold">{decision.conditionScore}/100</div>
                    <div className="text-[11px] text-storm">Condition score</div>
                  </div>
                  <div className="rounded border border-line p-2 text-center">
                    <div className="font-bold">{inr(decision.economics.estimatedSellingPrice)}</div>
                    <div className="text-[11px] text-storm">Est. selling price</div>
                  </div>
                  <div className="rounded border border-line p-2 text-center">
                    <div className="font-bold">{inr(decision.economics.recoveryValue)}</div>
                    <div className="text-[11px] text-storm">Recovery value</div>
                  </div>
                  <div className="rounded border border-line p-2 text-center">
                    <div className="font-bold">{decision.sustainability.co2SavedKg}kg</div>
                    <div className="text-[11px] text-storm">CO₂ saved</div>
                  </div>
                  <div className="rounded border border-line p-2 text-center">
                    <div className="font-bold">+{decision.sustainability.reLoopCredits}</div>
                    <div className="text-[11px] text-storm">ReLoop credits</div>
                  </div>
                  <div className="rounded border border-line p-2 text-center">
                    <div className="font-bold">{Math.round(decision.economics.recoveryPct * 100)}%</div>
                    <div className="text-[11px] text-storm">Recovery %</div>
                  </div>
                </div>
                {/* All routes comparison */}
                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold uppercase text-storm">All routes</div>
                  <div className="space-y-1">
                    {decision.options.map((o) => (
                      <div
                        key={o.route}
                        className={`flex items-center justify-between rounded p-2 text-sm ${
                          o.recommended ? "bg-ember/10 ring-1 ring-ember" : "bg-cloud"
                        }`}
                      >
                        <span className="font-medium">
                          {o.icon} {o.label} {o.recommended && "✓"}
                        </span>
                        <span className="text-xs text-storm">
                          {inr(o.recoveryValue)} · {o.co2SavedKg}kg · +{o.reLoopCredits}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Feasibility breakdown */}
            {d.feasibility && (
              <FeasibilityPanel feasibility={d.feasibility} decision={d.case.decision} grade={d.case.grade} />
            )}

            {/* Admin route resolution — only for routing escalations */}
            {isRoutingEscalation && !resolved && (
              <div className="rounded border-2 border-ember bg-white p-4">
                <h3 className="mb-2 font-bold text-ember">🧑‍⚖️ Resolve routing escalation</h3>
                <p className="mb-3 text-sm text-storm">
                  The customer escalated Nemo&apos;s recommendation. Choose the final route:
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {(["RESELL_AS_IS", "REFURBISH", "PEER_TO_PEER", "DONATE", "RECYCLE"] as RouteDTO[]).map(
                    (route) => {
                      const opt = decision?.options.find((o) => o.route === route);
                      const isRecommended = route === decision?.recommendedRoute;
                      return (
                        <button
                          key={route}
                          onClick={() => setChosenRoute(route)}
                          className={`rounded border p-2 text-left text-sm transition-colors ${
                            chosenRoute === route
                              ? "border-ember bg-ember/10"
                              : isRecommended
                                ? "border-success/50 bg-success/5"
                                : "border-line hover:bg-mist/40"
                          }`}
                        >
                          <span className="font-medium">
                            {opt?.icon ?? "📦"} {route.replace(/_/g, " ")}
                          </span>
                          {isRecommended && (
                            <span className="ml-1 text-[10px] font-bold text-success">AI PICK</span>
                          )}
                          {opt && (
                            <div className="text-xs text-storm">
                              {inr(opt.recoveryValue)} · {opt.co2SavedKg}kg CO₂ · +{opt.reLoopCredits}
                            </div>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
                {actionError && <p className="mt-2 text-sm text-danger">{actionError}</p>}
                <Button
                  disabled={!chosenRoute || actionBusy}
                  onClick={() => chosenRoute && resolveRoute(chosenRoute)}
                  className="mt-3"
                >
                  {actionBusy ? "Applying…" : `Apply route → ${chosenRoute ? chosenRoute.replace(/_/g, " ") : "select one"}`}
                </Button>
              </div>
            )}
            {resolved && (
              <div className="rounded border border-success bg-success/10 p-4 text-center">
                <span className="text-2xl">✅</span>
                <p className="mt-1 font-bold text-success">Route applied successfully</p>
                <p className="text-sm text-storm">
                  The case has been routed. The customer will see the outcome on their return page.
                </p>
              </div>
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
