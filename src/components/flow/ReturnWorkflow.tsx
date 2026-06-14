"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import type { EligibleOrderDTO, ItemDTO, ReturnCaseDTO } from "@/types/dto";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GradeBadge } from "@/components/GradeBadge";
import { LoadingState, ErrorState } from "./States";
import { FeasibilityPanel } from "./FeasibilityPanel";
import { WorkflowTracker } from "./WorkflowTracker";
import { Countdown } from "./Countdown";
import { EventTimeline } from "./EventTimeline";

const REASONS = [
  "Size too small",
  "Size too large",
  "Color not as pictured",
  "Defective on arrival",
  "Changed my mind",
];

type Img = { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; preview: string };

function fileToImage(file: File): Promise<Img> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.split(",")[1] ?? "";
      const mime =
        file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
      resolve({ base64, mimeType: mime, preview: result });
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

const TERMINAL = ["RETURNED_TO_SELLER", "COMPLETED", "TRANSFER_REJECTED", "LIQUIDATED"];

export function ReturnWorkflow() {
  const router = useRouter();

  // selection
  const [orders, setOrders] = useState<EligibleOrderDTO[]>([]);
  const [selected, setSelected] = useState<ItemDTO | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [photos, setPhotos] = useState<Img[]>([]);

  // case
  const [rc, setRc] = useState<ReturnCaseDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [noBuyerYet, setNoBuyerYet] = useState(false);

  useEffect(() => {
    apiClient.getOrders().then(setOrders).catch(() => undefined);
  }, []);

  const describe = (e: unknown) =>
    e instanceof ApiError ? `${e.message}` : e instanceof Error ? e.message : "Something went wrong";

  async function onPickFiles(files: FileList | null) {
    if (!files) return;
    const imgs = await Promise.all(Array.from(files).slice(0, 3).map(fileToImage));
    setPhotos(imgs);
  }

  // Step 1: initiate → grade → analyze (the AI grading runs first, then feasibility)
  async function start() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      setBusyLabel("Initiating return request…");
      const created = await apiClient.initiateReturnCase(selected.id, reason);
      setRc(created);

      setBusyLabel("Running AI grading on your photos…");
      const images = photos.length
        ? photos.map((p) => ({ base64: p.base64, mimeType: p.mimeType }))
        : [{ base64: TINY_PNG, mimeType: "image/png" as const }];
      const graded = await apiClient.gradeCase(created.id, images);
      setRc(graded);

      setBusyLabel("Running Feasibility Analysis Engine…");
      const analyzed = await apiClient.analyzeCase(created.id);
      setRc(analyzed);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  const act = useCallback(
    async (label: string, fn: () => Promise<ReturnCaseDTO>) => {
      setError(null);
      setBusy(true);
      setBusyLabel(label);
      try {
        setRc(await fn());
      } catch (e) {
        setError(describe(e));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  async function searchBuyer() {
    if (!rc) return;
    setError(null);
    setBusy(true);
    setBusyLabel("Searching for nearby interested buyers…");
    try {
      const res = await apiClient.findBuyerForCase(rc.id);
      setRc(res.case);
      setNoBuyerYet(!res.found);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  // ─────────── Render: selection ───────────
  if (!rc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Return a delivered order</h1>
        <p className="text-sm text-storm">
          We grade it, run a full feasibility analysis, and decide the best path — return to
          seller, Second Life resale, or disposition.
        </p>

        {!selected ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {orders.map((o) => {
              const it = o.order.item;
              return (
                <button
                  key={o.order.id}
                  disabled={!o.returnEligible}
                  onClick={() => o.returnEligible && setSelected(it)}
                  className={`rounded border bg-white p-4 text-left ${
                    o.returnEligible ? "border-line hover:shadow-cardHover" : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{it.name}</span>
                    {it.currentGrade && <GradeBadge grade={it.currentGrade} size="sm" />}
                  </div>
                  <p className="text-xs text-storm">
                    {it.category} · ₹{it.originalPrice.toLocaleString("en-IN")}
                  </p>
                  <div className="mt-2">
                    {o.returnEligible ? (
                      <Badge tone="success">Returnable · {o.returnDaysLeft}d left</Badge>
                    ) : (
                      <Badge tone="danger">{o.reasonIfNot}</Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <Card className="mt-4">
            <CardBody className="space-y-4">
              <button onClick={() => setSelected(null)} className="text-sm font-medium text-link hover:underline">
                ← Choose a different item
              </button>
              <div className="flex items-center justify-between rounded bg-cloud p-3">
                <div>
                  <div className="font-semibold">{selected.name}</div>
                  <div className="text-xs text-storm">
                    {selected.category} · ₹{selected.originalPrice.toLocaleString("en-IN")}
                  </div>
                </div>
                {selected.currentGrade && <GradeBadge grade={selected.currentGrade} size="sm" />}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Reason for return</label>
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
                <label className="mb-1 block text-sm font-semibold">Photos (for AI grading)</label>
                <input type="file" accept="image/*" multiple onChange={(e) => onPickFiles(e.target.files)} className="block w-full text-sm" />
                {photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {photos.map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={p.preview} alt={`photo ${i + 1}`} className="h-16 w-16 rounded border border-line object-cover" />
                    ))}
                  </div>
                )}
              </div>
              {error && <ErrorState message={error} />}
              <Button size="lg" disabled={busy} onClick={start}>
                {busy ? busyLabel : "Initiate return & analyze →"}
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  // ─────────── Render: active case ───────────
  const f = rc.feasibility;
  const inSecondLife = rc.status === "SECOND_LIFE_LISTED";
  const inVerification = rc.status === "DELIVERY_VERIFICATION";
  const isTerminal = TERMINAL.includes(rc.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Return Workflow</h1>
        <span className="text-xs text-storm">Case {rc.id.slice(-6)}</span>
      </div>
      <p className="text-sm text-storm">
        {rc.item.name} · {rc.item.category} · reason: {rc.reason}
      </p>

      <WorkflowTracker case={rc} />

      {busy && <LoadingState label={busyLabel} />}
      {error && <ErrorState message={error} />}

      {/* Decision + feasibility */}
      {f && (
        <div className="mt-4">
          <FeasibilityPanel feasibility={f} decision={rc.decision} grade={rc.grade} />
        </div>
      )}

      {/* Second Life window */}
      {(inSecondLife || rc.status === "BUYER_RESERVED" || rc.status === "SL_PICKUP_SCHEDULED" || inVerification) &&
        rc.secondLifeDeadline && (
          <Card className="mt-4 border-ember/40">
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">🔁 Second Life Opportunity Window</h2>
                <Countdown deadline={rc.secondLifeDeadline} />
              </div>
              {rc.secondLifeListingId && (
                <Link
                  href={`/marketplace/${rc.secondLifeListingId}`}
                  className="text-sm font-medium text-link hover:underline"
                >
                  View the live Second Life listing →
                </Link>
              )}
              {rc.reservedBuyerName && (
                <p className="text-sm">
                  Reserved for <span className="font-semibold">{rc.reservedBuyerName}</span> (
                  {rc.reservedDistanceKm}km — nearest buyer, lowest logistics cost).
                </p>
              )}

              {inSecondLife && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={searchBuyer} disabled={busy}>
                    Search for nearby buyers
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => act("Closing window → disposition…", () => apiClient.expireWindow(rc.id, true))}
                  >
                    No buyer — close window (disposition)
                  </Button>
                </div>
              )}
              {noBuyerYet && inSecondLife && (
                <p className="text-sm text-storm">
                  No interested buyer found yet — search continues during the window.
                </p>
              )}
            </CardBody>
          </Card>
        )}

      {/* Contextual actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {rc.status === "RETURN_PICKUP_SCHEDULED" && (
          <Button
            disabled={busy}
            onClick={() => act("Delivery partner collecting…", () => apiClient.completePickup(rc.id))}
          >
            Confirm pickup collected → return to seller
          </Button>
        )}

        {inVerification && !showReject && (
          <>
            <Button
              disabled={busy}
              onClick={() => act("Delivery partner verifying…", () => apiClient.verifyTransfer(rc.id, true))}
            >
              ✅ Delivery partner: Approve transfer
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => setShowReject(true)}>
              ✕ Reject (condition/damage/fraud)
            </Button>
          </>
        )}
        {inVerification && showReject && (
          <div className="w-full space-y-2 rounded border border-danger/30 bg-danger/5 p-3">
            <label className="text-sm font-semibold text-danger">Rejection reason</label>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Condition differs significantly from AI grade; screen cracked"
              className="w-full rounded border border-line px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={busy || !rejectReason.trim()}
                onClick={() =>
                  act("Recording rejection…", () => apiClient.verifyTransfer(rc.id, false, rejectReason.trim()))
                }
              >
                Confirm rejection
              </Button>
              <Button variant="secondary" onClick={() => setShowReject(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Terminal outcome */}
      {isTerminal && (
        <Card className="mt-4">
          <CardBody className="space-y-3 text-center">
            <div className="text-4xl">
              {rc.status === "COMPLETED"
                ? "🎉"
                : rc.status === "RETURNED_TO_SELLER"
                  ? "📦"
                  : rc.status === "TRANSFER_REJECTED"
                    ? "🚫"
                    : "♻️"}
            </div>
            <h2 className="text-xl font-bold">{outcomeTitle(rc)}</h2>
            {rc.rejectionReason && <p className="text-sm text-danger">Reason: {rc.rejectionReason}</p>}
            {rc.refundAmount != null && (
              <p className="text-sm text-success">
                Refund of ₹{rc.refundAmount.toLocaleString("en-IN")} initiated to the customer.
              </p>
            )}
            {rc.disposition && <Badge tone="info">Disposition: {rc.disposition}</Badge>}
            <div>
              <Button size="lg" onClick={() => router.push("/")}>
                Done — back to Home →
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Audit trail */}
      <EventTimeline events={rc.events} />
    </div>
  );
}

function outcomeTitle(rc: ReturnCaseDTO): string {
  switch (rc.status) {
    case "COMPLETED":
      return "Second Life transfer completed & customer refunded";
    case "RETURNED_TO_SELLER":
      return "Returned to seller / refurbishment center";
    case "TRANSFER_REJECTED":
      return "Second Life transfer rejected";
    case "LIQUIDATED":
      return "Routed to disposition flow";
    default:
      return rc.status;
  }
}

// A real 1x1 PNG fallback so grading always has a decodable image.
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
