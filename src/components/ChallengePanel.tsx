"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { ChallengeDTO, ChallengeStatusDTO } from "@/types/dto";
import type { Grade } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { GradeBadge } from "@/components/GradeBadge";
import { PhotoUploader, type UploadedPhoto } from "@/components/flow/PhotoUploader";

/**
 * Seller-facing AI-verdict dispute. Lets a seller open a formal challenge on a
 * graded return (reason + explanation + supporting photos) and then transparently
 * track its status, the reviewer's decision, and the full audit trail.
 */

const REASONS = [
  "Grade is too low",
  "Detected flaws are inaccurate",
  "Wrong item was identified",
  "Fraud risk is incorrect",
  "Other",
];

const STATUS_META: Record<ChallengeStatusDTO, { label: string; tone: string }> = {
  OPEN: { label: "Open — awaiting review", tone: "border-link/40 bg-link/10 text-link" },
  UNDER_REVIEW: { label: "Under review", tone: "border-warn/40 bg-warn/10 text-warn" },
  NEEDS_MORE_INFO: {
    label: "More info requested",
    tone: "border-warn/40 bg-warn/10 text-warn",
  },
  RESOLVED_UPHELD: {
    label: "Resolved — AI verdict upheld",
    tone: "border-storm/40 bg-mist text-storm",
  },
  RESOLVED_MODIFIED: {
    label: "Resolved — grade modified",
    tone: "border-success/40 bg-success/10 text-success",
  },
  RESOLVED_OVERRIDDEN: {
    label: "Resolved — grade overridden",
    tone: "border-success/40 bg-success/10 text-success",
  },
  REJECTED: { label: "Rejected — verdict stands", tone: "border-danger/40 bg-danger/10 text-danger" },
};

export function ChallengePanel({
  returnCaseId,
  aiGrade,
}: {
  returnCaseId: string;
  aiGrade: Grade | null;
}) {
  const [challenge, setChallenge] = useState<ChallengeDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [reason, setReason] = useState(REASONS[0]);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [moreComment, setMoreComment] = useState("");
  const [morePhotos, setMorePhotos] = useState<UploadedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getMyChallenges()
      .then((all) => setChallenge(all.find((c) => c.returnCaseId === returnCaseId) ?? null))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [returnCaseId]);

  const describe = (e: unknown) =>
    e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong";

  async function submit() {
    if (!comment.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.openChallenge(returnCaseId, {
        reason,
        comment: comment.trim(),
        evidence: photos.map((p) => ({ data: p.base64, mimeType: p.mimeType, role: p.role })),
      });
      setChallenge(created);
      setOpen(false);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  async function addMore() {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.addChallengeEvidence(challenge.id, {
        comment: moreComment.trim() || undefined,
        evidence: morePhotos.map((p) => ({ data: p.base64, mimeType: p.mimeType, role: p.role })),
      });
      setChallenge(updated);
      setMoreComment("");
      setMorePhotos([]);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  // ── Existing dispute → tracking view ──
  if (challenge) {
    const meta = STATUS_META[challenge.status];
    return (
      <Card className="mt-4">
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">⚖️ AI Verdict Challenge</h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.tone}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-xs text-storm">
            Ticket #{challenge.id.slice(-6)} · routed to {challenge.assignedTo ?? "review team"} ·
            disputed AI Grade{" "}
            {challenge.snapshot.grade ? <GradeBadge grade={challenge.snapshot.grade} size="sm" /> : "—"}
          </p>
          <p className="rounded bg-cloud p-2 text-sm text-ink">
            <span className="font-semibold">{challenge.reason}:</span> {challenge.sellerComment}
          </p>

          {challenge.resolution && (
            <div className="rounded border border-line bg-white p-3 text-sm">
              <div className="font-semibold">
                Decision: {challenge.resolution}
                {challenge.revisedGrade && (
                  <>
                    {" "}
                    → <GradeBadge grade={challenge.revisedGrade} size="sm" />
                  </>
                )}
              </div>
              {challenge.resolutionReasoning && (
                <p className="mt-1 text-storm">{challenge.resolutionReasoning}</p>
              )}
              {challenge.resolvedByName && (
                <p className="mt-1 text-xs text-storm">Reviewed by {challenge.resolvedByName}</p>
              )}
            </div>
          )}

          {/* Add more info when requested */}
          {challenge.status === "NEEDS_MORE_INFO" && (
            <div className="space-y-2 rounded border border-warn/30 bg-warn/5 p-3">
              <p className="text-sm font-semibold text-warn">
                The reviewer requested more information.
              </p>
              <textarea
                value={moreComment}
                onChange={(e) => setMoreComment(e.target.value)}
                placeholder="Add a comment for the reviewer…"
                className="w-full rounded border border-line px-3 py-2 text-sm"
                rows={2}
              />
              <PhotoUploader photos={morePhotos} onChange={setMorePhotos} />
              <Button
                disabled={busy || (!moreComment.trim() && morePhotos.length === 0)}
                onClick={addMore}
              >
                Submit additional evidence
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          {/* Audit trail */}
          <div className="border-t border-line pt-2">
            <p className="mb-2 text-xs font-semibold text-storm">Audit trail</p>
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
        </CardBody>
      </Card>
    );
  }

  // ── No dispute yet → open one ──
  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-link hover:text-linkHover hover:underline"
        >
          Disagree with the AI assessment{aiGrade ? ` (Grade ${aiGrade})` : ""}? Challenge it →
        </button>
      ) : (
        <Card className="border-link/40">
          <CardBody className="space-y-3">
            <h2 className="font-bold">⚖️ Challenge the AI verdict</h2>
            <p className="text-sm text-storm">
              Submit a formal review request. An Operations reviewer will examine the original AI
              assessment, your evidence and explanation, then uphold, modify, or override the grade.
            </p>
            <div>
              <label className="mb-1 block text-sm font-semibold">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded border border-line px-3 py-2 text-sm"
              >
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Explanation</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explain why you believe the AI assessment is incorrect…"
                className="w-full rounded border border-line px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Supporting photos (optional)</label>
              <PhotoUploader photos={photos} onChange={setPhotos} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button disabled={busy || !comment.trim()} onClick={submit}>
                {busy ? "Submitting…" : "Submit challenge"}
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
