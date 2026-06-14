"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { ChallengeDTO, ChallengeStatusDTO } from "@/types/dto";
import type { Grade } from "@/types";
import { GradeBadge } from "@/components/GradeBadge";
import { ProductImage } from "@/components/ProductImage";
import { VerificationPanel } from "@/components/VerificationPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/flow/States";

/**
 * Operations review queue for AI-verdict challenges. A reviewer sees the full
 * ticket — the original AI assessment + confidence/fraud scores, the seller's
 * uploaded evidence and explanation, the item's history, and the audit trail —
 * then assigns, requests more info, or resolves (uphold / modify / override /
 * reject). Every action is dynamic; nothing is hardcoded.
 */

const GRADES: Grade[] = ["A", "B", "C", "D"];

function statusTone(s: ChallengeStatusDTO): "success" | "info" | "warn" | "danger" | "neutral" {
  if (s === "RESOLVED_MODIFIED" || s === "RESOLVED_OVERRIDDEN") return "success";
  if (s === "REJECTED") return "danger";
  if (s === "NEEDS_MORE_INFO" || s === "UNDER_REVIEW") return "warn";
  if (s === "RESOLVED_UPHELD") return "neutral";
  return "info";
}

const isResolved = (s: ChallengeStatusDTO) => s.startsWith("RESOLVED") || s === "REJECTED";

export function ChallengeReview() {
  const [rows, setRows] = useState<ChallengeDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChallengeDTO | null>(null);

  function load() {
    apiClient
      .adminChallenges()
      .then((all) => {
        setRows(all);
        // keep the open detail fresh
        setSelected((cur) => (cur ? all.find((c) => c.id === cur.id) ?? cur : cur));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load challenges"));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!rows) return <LoadingState label="Loading review queue…" />;

  const open = rows.filter((r) => !isResolved(r.status));

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-bold">AI Verdict Challenges</h2>
        <p className="text-sm text-storm">
          {open.length} open of {rows.length} total. Sellers disputing an AI grade — review the
          evidence and adjudicate.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded border border-line bg-white p-8 text-center text-sm text-storm">
          No challenges have been filed yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-mist text-left text-xs uppercase text-storm">
              <tr>
                <th className="px-3 py-2">Ticket</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Seller</th>
                <th className="px-3 py-2">AI Grade</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-line hover:bg-cloud">
                  <td className="px-3 py-2 font-mono text-xs">
                    #{c.id.slice(-6)}
                    {c.kind !== "GRADE_DISPUTE" && (
                      <span className="ml-1 rounded bg-link/10 px-1 py-0.5 text-[9px] font-bold text-link">
                        {c.kind === "SELL_VERIFICATION" ? "SELL" : "RETURN"} VERIFY
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{c.item.name}</td>
                  <td className="px-3 py-2">{c.openedByName ?? c.openedByUserId}</td>
                  <td className="px-3 py-2">
                    {c.snapshot.grade ? <GradeBadge grade={c.snapshot.grade} size="sm" /> : "—"}
                    {c.revisedGrade && (
                      <>
                        {" → "}
                        <GradeBadge grade={c.revisedGrade} size="sm" />
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2 text-storm">{c.reason}</td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(c.status)}>{c.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setSelected(c)}
                      className="text-sm font-medium text-link hover:underline"
                    >
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ChallengeDetail
          challenge={selected}
          onClose={() => setSelected(null)}
          onChanged={(updated) => {
            setSelected(updated);
            load();
          }}
        />
      )}
    </div>
  );
}

function ChallengeDetail({
  challenge,
  onClose,
  onChanged,
}: {
  challenge: ChallengeDTO;
  onClose: () => void;
  onChanged: (c: ChallengeDTO) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState("");
  const [resolution, setResolution] = useState<"UPHOLD" | "MODIFY" | "OVERRIDE" | "REJECT">("UPHOLD");
  const [revisedGrade, setRevisedGrade] = useState<Grade>(challenge.snapshot.grade ?? "B");
  const [reasoning, setReasoning] = useState("");

  const resolved = isResolved(challenge.status);
  const needsGrade = resolution === "MODIFY" || resolution === "OVERRIDE";
  const isVerification = challenge.kind !== "GRADE_DISPUTE";

  async function run(fn: () => Promise<ChallengeDTO>) {
    setBusy(true);
    setError(null);
    try {
      onChanged(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const snap = challenge.snapshot;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-squid/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-mist p-5 shadow-cardHover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Challenge #{challenge.id.slice(-6)}</h2>
          <button onClick={onClose} className="text-sm text-storm hover:text-ink">
            ✕ Close
          </button>
        </div>

        {/* Item + requester */}
        <div className="flex items-center gap-3 rounded border border-line bg-white p-3">
          <ProductImage
            src={challenge.item.imageUrl}
            category={challenge.item.category}
            alt={challenge.item.name}
            className="h-14 w-14 rounded"
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{challenge.item.name}</div>
            <div className="text-xs text-storm">
              {challenge.item.category} · by {challenge.openedByName ?? challenge.openedByUserId}
              {challenge.returnCase
                ? ` · return reason: ${challenge.returnCase.reason}`
                : challenge.kind === "SELL_VERIFICATION"
                  ? " · Sell listing verification"
                  : " · verification"}
            </div>
          </div>
          <Badge tone={statusTone(challenge.status)}>{challenge.status.replace(/_/g, " ")}</Badge>
        </div>

        {/* Original AI assessment */}
        <div className="mt-3 rounded border border-line bg-white p-3">
          <h3 className="mb-2 text-sm font-bold">Original AI assessment</h3>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              Grade {snap.grade ? <GradeBadge grade={snap.grade} size="sm" /> : "—"}
            </span>
            {snap.gradeConfidence != null && (
              <span>Quality conf: {Math.round(snap.gradeConfidence * 100)}%</span>
            )}
            {snap.productMatchConfidence != null && (
              <span>Match: {Math.round(snap.productMatchConfidence * 100)}%</span>
            )}
            {snap.fraudRiskScore != null && (
              <span>Fraud risk: {Math.round(snap.fraudRiskScore * 100)}%</span>
            )}
          </div>
          {snap.gradeSummary && <p className="mt-1 text-xs text-storm">{snap.gradeSummary}</p>}
          {snap.flaws.length > 0 && (
            <ul className="mt-1 text-xs text-storm">
              {snap.flaws.map((f, i) => (
                <li key={i}>
                  • {f.type} ({f.severity}) — {f.location}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Verification detail */}
        {snap.verification && (
          <div className="mt-3">
            <VerificationPanel
              verification={{
                ...snap.verification,
                deviations: snap.verification.deviations.map((d) => ({
                  attribute: d.attribute,
                  detail: d.detail,
                  severity: d.severity as "minor" | "moderate" | "severe",
                })),
                recommendation: snap.verification.recommendation as
                  | "PROCEED"
                  | "REQUEST_EVIDENCE"
                  | "MANUAL_REVIEW",
                verifiedBy: snap.verification.verifiedBy as "bedrock" | "clip" | "local",
                imageRoles: [],
                summary: "Assessment captured at dispute time.",
                tookMs: 0,
              }}
            />
          </div>
        )}

        {/* Seller's case */}
        <div className="mt-3 rounded border border-line bg-white p-3">
          <h3 className="mb-1 text-sm font-bold">Seller&apos;s argument</h3>
          <p className="text-sm">
            <span className="font-semibold">{challenge.reason}:</span> {challenge.sellerComment}
          </p>
          {challenge.evidence.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {challenge.evidence.map((ev) => (
                <div key={ev.id} className="w-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      ev.data.startsWith("http") || ev.data.startsWith("data:")
                        ? ev.data
                        : `data:${ev.mimeType};base64,${ev.data}`
                    }
                    alt={ev.role}
                    className="h-20 w-20 rounded border border-line object-cover"
                  />
                  <div className="mt-0.5 text-center text-[10px] capitalize text-storm">
                    {ev.role}
                    {ev.addedBy !== "seller" ? ` · ${ev.addedBy}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviewer actions */}
        {!resolved ? (
          <div className="mt-3 space-y-3 rounded border border-ember/40 bg-white p-3">
            <h3 className="text-sm font-bold">Reviewer decision</h3>
            {challenge.status === "OPEN" && (
              <Button disabled={busy} onClick={() => run(() => apiClient.adminAssignChallenge(challenge.id))}>
                Pick up for review
              </Button>
            )}

            <div className="rounded border border-line p-3">
              <label className="mb-1 block text-xs font-semibold text-storm">
                Request more information
              </label>
              <textarea
                value={infoMsg}
                onChange={(e) => setInfoMsg(e.target.value)}
                placeholder="What does the seller need to provide?"
                className="w-full rounded border border-line px-2 py-1 text-sm"
                rows={2}
              />
              <Button
                variant="secondary"
                disabled={busy || !infoMsg.trim()}
                onClick={() =>
                  run(() => apiClient.adminRequestChallengeInfo(challenge.id, infoMsg.trim()))
                }
                className="mt-2"
              >
                Request info
              </Button>
            </div>

            {isVerification ? (
              <div className="rounded border border-line p-3">
                <label className="mb-1 block text-xs font-semibold text-storm">
                  Human verification decision
                </label>
                <p className="mb-2 text-xs text-storm">
                  The AI gate flagged this item. Confirm whether it&apos;s genuine.
                  {challenge.kind === "SELL_VERIFICATION"
                    ? " Accepting lists it for sale automatically."
                    : " Accepting resumes the return (grade + feasibility); rejecting denies it."}
                </p>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Decision reasoning (recorded in the audit trail)…"
                  className="w-full rounded border border-line px-2 py-1 text-sm"
                  rows={2}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    disabled={busy || !reasoning.trim()}
                    onClick={() =>
                      run(() =>
                        apiClient.adminDecideChallenge(challenge.id, {
                          decision: "ACCEPT",
                          reasoning: reasoning.trim(),
                        }),
                      )
                    }
                  >
                    ✅ Accept (genuine)
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy || !reasoning.trim()}
                    onClick={() =>
                      run(() =>
                        apiClient.adminDecideChallenge(challenge.id, {
                          decision: "REJECT",
                          reasoning: reasoning.trim(),
                        }),
                      )
                    }
                  >
                    ✕ Reject
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded border border-line p-3">
                <label className="mb-1 block text-xs font-semibold text-storm">Resolve</label>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as typeof resolution)}
                    className="rounded border border-line px-2 py-1 text-sm"
                  >
                    <option value="UPHOLD">Uphold AI verdict</option>
                    <option value="MODIFY">Modify grade</option>
                    <option value="OVERRIDE">Override grade</option>
                    <option value="REJECT">Reject challenge</option>
                  </select>
                  {needsGrade && (
                    <select
                      value={revisedGrade}
                      onChange={(e) => setRevisedGrade(e.target.value as Grade)}
                      className="rounded border border-line px-2 py-1 text-sm"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          Grade {g}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Decision reasoning (recorded in the audit trail and shown to the seller)…"
                  className="mt-2 w-full rounded border border-line px-2 py-1 text-sm"
                  rows={2}
                />
                <Button
                  disabled={busy || !reasoning.trim() || (needsGrade && !revisedGrade)}
                  onClick={() =>
                    run(() =>
                      apiClient.adminResolveChallenge(challenge.id, {
                        resolution,
                        revisedGrade: needsGrade ? revisedGrade : undefined,
                        reasoning: reasoning.trim(),
                      }),
                    )
                  }
                  className="mt-2"
                >
                  Submit decision
                </Button>
              </div>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        ) : (
          <div className="mt-3 rounded border border-line bg-white p-3 text-sm">
            <span className="font-semibold">Resolved:</span> {challenge.resolution}
            {challenge.revisedGrade && <> → Grade {challenge.revisedGrade}</>} by{" "}
            {challenge.resolvedByName}.
            {challenge.resolutionReasoning && (
              <p className="mt-1 text-storm">{challenge.resolutionReasoning}</p>
            )}
          </div>
        )}

        {/* Audit trail */}
        <div className="mt-3 rounded border border-line bg-white p-3">
          <h3 className="mb-2 text-sm font-bold">Audit trail</h3>
          <ol className="space-y-2">
            {challenge.events.map((ev) => (
              <li key={ev.id} className="flex gap-2 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-link" />
                <div>
                  <span className="text-ink">{ev.message}</span>
                  <span className="ml-1 text-storm">
                    — {ev.actor} · {new Date(ev.createdAt).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
