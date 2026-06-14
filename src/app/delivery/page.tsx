"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useUser } from "@/lib/user-context";
import { isDelivery } from "@/lib/session";
import type { DeliveryBoardDTO, DeliveryTaskDTO } from "@/types/dto";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/GradeBadge";
import { OriginalVsReturn } from "@/components/ReturnPhotos";
import { MiniMap } from "@/components/MiniMap";
import { LoadingState, ErrorState } from "@/components/flow/States";

export default function DeliveryPage() {
  const { user } = useUser();
  const [board, setBoard] = useState<DeliveryBoardDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    setError(null);
    apiClient
      .getDeliveryTasks()
      .then(setBoard)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load route"));
  }, []);
  useEffect(load, [load]);

  async function run(id: string, fn: () => Promise<unknown>, msg: string) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      setRejecting(null);
      setRejectReason("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : msg);
    } finally {
      setBusyId(null);
    }
  }

  function accept(t: DeliveryTaskDTO) {
    run(
      t.caseId,
      () =>
        t.kind === "RETURN_PICKUP"
          ? apiClient.completePickup(t.caseId)
          : apiClient.verifyTransfer(t.caseId, true),
      "Could not accept",
    );
  }
  function reject(t: DeliveryTaskDTO, reason: string) {
    run(
      t.caseId,
      () =>
        t.kind === "RETURN_PICKUP"
          ? apiClient.rejectPickup(t.caseId, reason)
          : apiClient.verifyTransfer(t.caseId, false, reason),
      "Could not reject",
    );
  }

  if (!isDelivery(user)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mb-3 text-5xl">🚚</div>
        <h1 className="text-2xl font-bold">Delivery partners only</h1>
        <p className="mt-2 text-sm text-storm">
          This route board is for Amazon Nemo delivery partners. You&apos;re signed in as{" "}
          <span className="font-semibold">{user.name}</span> ({user.role}).
        </p>
        <Link href="/login" className="mt-5 inline-block">
          <Button size="lg">Switch to the delivery account</Button>
        </Link>
      </div>
    );
  }

  if (error && !board) return <div className="mx-auto max-w-4xl p-4"><ErrorState message={error} onRetry={load} /></div>;
  if (!board) return <div className="mx-auto max-w-4xl p-4"><LoadingState label="Loading today's route…" /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today&apos;s Route</h1>
          <p className="text-sm text-storm">Your pickups for the day — inspect each item and accept or reject.</p>
        </div>
        <button onClick={load} className="text-sm font-medium text-link hover:underline">
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        {[
          { label: "Pickups", value: board.stats.pickups, icon: "📦" },
          { label: "Completed", value: board.stats.completed, icon: "✅" },
        ].map((s) => (
          <div key={s.label} className="rounded-card border border-line bg-white p-3 text-center">
            <div className="text-2xl font-bold text-ink">
              {s.icon} {s.value}
            </div>
            <div className="text-xs text-storm">{s.label}</div>
          </div>
        ))}
      </div>

      {error && <div className="mb-3"><ErrorState message={error} /></div>}

      {/* Pickups — inspect against the original, then accept or reject */}
      <h2 className="mb-2 text-lg font-bold">Pickups ({board.pickups.length})</h2>
      {board.pickups.length === 0 ? (
        <p className="mb-6 rounded border border-line bg-white p-4 text-sm text-storm">
          No pickups scheduled right now.
        </p>
      ) : (
        <div className="mb-6 space-y-3">
          {board.pickups.map((t) => (
            <div key={t.caseId} className="rounded-card border border-line bg-white p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{t.itemName}</span>
                    {t.grade && <GradeBadge grade={t.grade} size="sm" />}
                    <span className="rounded bg-link/10 px-1.5 py-0.5 text-[10px] font-bold text-link">
                      {t.kind === "RETURN_PICKUP" ? "RETURN" : "EXCHANGE"}
                    </span>
                  </div>
                  <p className="text-xs text-storm">
                    {t.brand ? `${t.brand} · ` : ""}
                    {t.category} · reason: {t.reason}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-storm">#{t.caseId.slice(-6)}</span>
              </div>

              <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-storm">
                <span>📍 From: <span className="font-medium text-ink">{t.fromLabel}</span></span>
                <span>🏁 To: <span className="font-medium text-ink">{t.toLabel}</span></span>
                {t.distanceKm != null && <span>~{t.distanceKm}km</span>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <OriginalVsReturn
                  originalImageUrl={t.originalImageUrl}
                  category={t.category}
                  photos={t.returnPhotos}
                />
                <MiniMap lat={t.lat} lng={t.lng} label={t.locationLabel} />
              </div>

              <p className="mt-2 text-xs text-storm">
                Confirm the collected item matches the original above, then accept or reject this
                {t.kind === "RETURN_PICKUP" ? " return" : " exchange"}.
              </p>

              {rejecting === t.caseId ? (
                <div className="mt-2 space-y-2 rounded border border-danger/30 bg-danger/5 p-3">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (e.g. condition differs, wrong item, damaged)"
                    className="w-full rounded border border-line px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      disabled={busyId === t.caseId || !rejectReason.trim()}
                      onClick={() => reject(t, rejectReason.trim())}
                    >
                      Confirm rejection
                    </Button>
                    <Button variant="secondary" onClick={() => setRejecting(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Button disabled={busyId === t.caseId} onClick={() => accept(t)}>
                    ✅ Accept
                  </Button>
                  <Button variant="danger" disabled={busyId === t.caseId} onClick={() => setRejecting(t.caseId)}>
                    ✕ Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed drops */}
      {board.completed.length > 0 && (
        <>
          <h2 className="mb-2 text-lg font-bold">Completed today</h2>
          <ul className="space-y-2">
            {board.completed.map((t) => (
              <li
                key={t.caseId}
                className="flex items-center justify-between rounded border border-line bg-white p-3 text-sm"
              >
                <span>
                  <span className="font-medium">{t.itemName}</span>{" "}
                  <span className="text-storm">→ {t.toLabel}</span>
                </span>
                <span
                  className={`text-xs font-semibold ${
                    t.status === "TRANSFER_REJECTED" ? "text-danger" : "text-success"
                  }`}
                >
                  {t.status === "TRANSFER_REJECTED" ? "Rejected" : "Delivered"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
