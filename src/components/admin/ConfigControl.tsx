"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { AdminConfigDTO, AdminCaseRowDTO, AdminCaseDetailDTO } from "@/types/dto";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/flow/States";

const FIELDS: Array<{ key: keyof AdminConfigDTO; label: string; step: number; hint: string }> = [
  { key: "matchRadiusKm", label: "Match radius (km)", step: 0.5, hint: "How far we search for nearby buyers" },
  { key: "feasibilityRatio", label: "Feasibility ratio", step: 0.05, hint: "Min resale-to-cost ratio to return" },
  { key: "peerToPeerMinBuyers", label: "Min nearby buyers (P2P)", step: 1, hint: "Buyers needed for peer-to-peer" },
  { key: "repairabilityThreshold", label: "Repairability threshold", step: 0.05, hint: "≥ this ⇒ refurbish viable" },
  { key: "returnWindowDays", label: "Return window (days)", step: 1, hint: "Return-eligibility window" },
  { key: "transportCostPerKm", label: "Transport cost / km (₹)", step: 0.5, hint: "Reverse-logistics line-haul" },
];

export function ConfigControl() {
  const [config, setConfig] = useState<AdminConfigDTO | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Live re-run demo
  const [cases, setCases] = useState<AdminCaseRowDTO[]>([]);
  const [sampleId, setSampleId] = useState<string>("");
  const [before, setBefore] = useState<AdminCaseDetailDTO | null>(null);
  const [after, setAfter] = useState<AdminCaseDetailDTO | null>(null);

  function loadConfig() {
    apiClient
      .adminConfig()
      .then((c) => {
        setConfig(c);
        setDraft(
          Object.fromEntries(FIELDS.map((f) => [f.key, Number(c[f.key])])) as Record<string, number>,
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load config"));
  }
  useEffect(() => {
    loadConfig();
    apiClient.adminCases().then((rs) => {
      setCases(rs);
      if (rs[0]) setSampleId(rs[0].id);
    });
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Snapshot the sample case's decision BEFORE applying the config change.
      if (sampleId) setBefore(await apiClient.adminCaseDetail(sampleId));
      const updated = await apiClient.adminUpdateConfig(draft);
      setConfig(updated);
      setSavedAt(new Date().toLocaleTimeString("en-IN"));
      // Re-run the SAME case AFTER — routing recomputes live against new config.
      if (sampleId) setAfter(await apiClient.adminCaseDetail(sampleId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update config");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={loadConfig} />;
  if (!config) return <LoadingState label="Loading config…" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Live Config Control</h2>
        <p className="text-sm text-storm">
          These routing rules come from the config table — not the code. Change one, save, and the
          decision engine re-runs live (no redeploy).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-line bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={String(f.key)} className="text-sm">
                <span className="block font-medium">{f.label}</span>
                <span className="mb-1 block text-xs text-storm">{f.hint}</span>
                <input
                  type="number"
                  step={f.step}
                  value={draft[f.key as string] ?? 0}
                  onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) })}
                  className="w-full rounded border border-line px-2 py-1"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? "Applying…" : "Apply & re-run"}
            </Button>
            {savedAt && <span className="text-xs text-success">✓ Applied at {savedAt}</span>}
          </div>
        </div>

        {/* Live re-run on a sample case */}
        <div className="rounded border border-line bg-white p-4">
          <label className="text-sm font-medium">Re-run this case after changes:</label>
          <select
            value={sampleId}
            onChange={(e) => setSampleId(e.target.value)}
            className="mt-1 w-full rounded border border-line px-2 py-1 text-sm"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.itemName} (Grade {c.grade})
              </option>
            ))}
          </select>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded bg-cloud p-2">
              <div className="text-xs text-storm">Before</div>
              <div className="font-bold">{before ? before.routing.path.replace(/_/g, " ") : "—"}</div>
              {before && <div className="text-xs text-storm">{before.nearbyDemandCount} nearby buyers</div>}
            </div>
            <div className="rounded bg-success/10 p-2">
              <div className="text-xs text-storm">After</div>
              <div className="font-bold text-success">
                {after ? after.routing.path.replace(/_/g, " ") : "—"}
              </div>
              {after && <div className="text-xs text-storm">{after.nearbyDemandCount} nearby buyers</div>}
            </div>
          </div>
          {before && after && before.routing.path !== after.routing.path && (
            <p className="mt-2 rounded bg-zest/20 p-2 text-xs font-medium text-ink">
              ⚡ The decision changed from config alone — proving the system is data-driven.
            </p>
          )}
          <p className="mt-2 text-xs text-storm">
            Tip: drop the match radius to 2km, or raise the feasibility ratio, then apply.
          </p>
        </div>
      </div>
    </div>
  );
}
