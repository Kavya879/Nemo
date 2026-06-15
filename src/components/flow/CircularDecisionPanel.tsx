"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CircularDecisionDTO, RouteDTO } from "@/types/dto";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "./States";

/**
 * Circular Commerce Decision Engine panel — the auto route recommendation with
 * full transparency: confidence, reasoning, economics, sustainability, a
 * five-route comparison, the "Why did Nemo choose this route?" breakdown, plus a
 * manual override and an escalate-to-admin path.
 */

const CONF_TONE = { High: "success", Medium: "warn", Low: "danger" } as const;
const INFLUENCE = {
  supports: { icon: "▲", cls: "text-success" },
  caution: { icon: "▼", cls: "text-warn" },
  neutral: { icon: "•", cls: "text-storm" },
} as const;

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function CircularDecisionPanel({
  caseId,
  onApplied,
}: {
  caseId: string;
  onApplied?: () => void;
}) {
  const [d, setD] = useState<CircularDecisionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [override, setOverride] = useState<RouteDTO | "">("");
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [reason, setReason] = useState("");

  const describe = (e: unknown) =>
    e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong";

  const load = useCallback(() => {
    setError(null);
    apiClient
      .getDecision(caseId)
      .then(setD)
      .catch((e) => setError(describe(e)));
  }, [caseId]);
  useEffect(load, [load]);

  async function apply(route: RouteDTO, overridden: boolean) {
    setBusy(true);
    setError(null);
    try {
      await apiClient.chooseRoute(caseId, route, {
        overridden,
        reason: overridden ? reason.trim() || undefined : undefined,
      });
      onApplied?.();
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  async function escalate() {
    setBusy(true);
    setError(null);
    try {
      await apiClient.escalateRoute(caseId, reason.trim() || undefined);
      onApplied?.();
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !d)
    return (
      <Card className="mt-4">
        <CardBody>
          <ErrorState message={error} onRetry={load} />
        </CardBody>
      </Card>
    );
  if (!d)
    return (
      <Card className="mt-4">
        <CardBody>
          <LoadingState label="Nemo is weighing the best second life…" />
        </CardBody>
      </Card>
    );

  const econ = d.economics;

  return (
    <Card className="mt-4 border-ember/40">
      <CardBody className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-ember">
                ⚡ Nemo Circular Decision Engine
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold">
              {d.recommendedIcon} {d.recommendedLabel}
            </h2>
          </div>
          <div className="text-right">
            <Badge tone={CONF_TONE[d.confidenceBand]}>
              {d.confidenceBand} confidence · {Math.round(d.confidence * 100)}%
            </Badge>
            {d.nudged && (
              <div className="mt-1 text-[11px] text-storm">
                Adjusted from score baseline ({d.scoreBandRoute.replace(/_/g, " ").toLowerCase()})
              </div>
            )}
          </div>
        </div>

        {/* Condition score bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-storm">
            <span>AI condition score</span>
            <span className="font-semibold text-ink">{d.conditionScore}/100</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-gradient-to-r from-danger via-warn to-success"
              style={{ width: `${d.conditionScore}%` }}
            />
          </div>
        </div>

        {/* Reasoning */}
        <p className="rounded bg-zest/10 p-3 text-sm text-ink">{d.reasoning}</p>

        {/* Economics + sustainability */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "Est. selling price", value: inr(econ.estimatedSellingPrice) },
            { label: "Refurbishment cost", value: inr(econ.refurbishmentCost) },
            { label: "Recovery", value: `${inr(econ.recoveryValue)} · ${Math.round(econ.recoveryPct * 100)}%` },
            { label: "CO₂ saved", value: `${d.sustainability.co2SavedKg}kg` },
            { label: "ReLoop credits", value: `+${d.sustainability.reLoopCredits}` },
          ].map((s) => (
            <div key={s.label} className="rounded border border-line bg-white p-2 text-center">
              <div className="text-sm font-bold text-ink">{s.value}</div>
              <div className="text-[11px] text-storm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Why did Nemo choose this route? */}
        <div>
          <button
            onClick={() => setShowWhy((v) => !v)}
            className="text-sm font-medium text-link hover:underline"
          >
            {showWhy ? "Hide" : "Why did Nemo choose this route?"}
          </button>
          {showWhy && (
            <ul className="mt-2 space-y-1.5">
              {d.factors.map((f) => {
                const inf = INFLUENCE[f.influence];
                return (
                  <li key={f.key} className="flex gap-2 text-sm">
                    <span className={`mt-0.5 ${inf.cls}`}>{inf.icon}</span>
                    <span>
                      <span className="font-medium text-ink">{f.label}:</span>{" "}
                      <span className="text-ink">{f.value}</span>{" "}
                      <span className="text-storm">— {f.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Five-route comparison */}
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-storm">All routes compared</div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {d.options.map((o) => (
              <button
                key={o.route}
                onClick={() => setOverride(o.route)}
                className={`flex items-center justify-between rounded border p-2 text-left text-sm transition-colors ${
                  o.recommended
                    ? "border-ember bg-ember/5"
                    : override === o.route
                      ? "border-link bg-link/5"
                      : "border-line bg-white hover:bg-mist/40"
                }`}
              >
                <span className="font-medium text-ink">
                  {o.icon} {o.label}
                  {o.recommended && <span className="ml-1 text-[10px] font-bold text-ember">✓ PICK</span>}
                </span>
                <span className="text-xs text-storm">
                  {inr(o.recoveryValue)} · {o.co2SavedKg}kg · +{o.reLoopCredits}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorState message={error} />}

        {/* Escalation suggestion */}
        {d.escalationSuggested && d.escalationReason && (
          <div className="rounded border border-warn/40 bg-warn/5 p-2 text-xs text-storm">
            🤔 {d.escalationReason} You can accept anyway, override, or escalate to Operations.
          </div>
        )}

        {/* Actions */}
        {(override && override !== d.recommendedRoute) || escalateOpen ? (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              escalateOpen ? "Why escalate? (optional)" : "Why override the recommendation? (optional)"
            }
            className="w-full rounded border border-line px-3 py-2 text-sm"
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {override && override !== d.recommendedRoute ? (
            <>
              <Button disabled={busy} onClick={() => override && apply(override, true)}>
                Override → {override.replace(/_/g, " ").toLowerCase()}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => setOverride("")}>
                Cancel
              </Button>
            </>
          ) : escalateOpen ? (
            <>
              <Button variant="danger" disabled={busy} onClick={escalate}>
                Confirm escalation
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => setEscalateOpen(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button disabled={busy} onClick={() => apply(d.recommendedRoute, false)}>
                ✅ Accept &amp; route ({d.recommendedLabel})
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => setEscalateOpen(true)}>
                🧑‍⚖️ Escalate to admin
              </Button>
            </>
          )}
        </div>
        <p className="text-[11px] text-storm">
          Tip: pick any route above to override Nemo&apos;s recommendation before applying.
        </p>
      </CardBody>
    </Card>
  );
}
