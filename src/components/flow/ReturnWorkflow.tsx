"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { useUser } from "@/lib/user-context";
import type { EligibleOrderDTO, ItemDTO, ReturnCaseDTO } from "@/types/dto";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GradeBadge } from "@/components/GradeBadge";
import { LoadingState, ErrorState } from "./States";
import { FeasibilityPanel } from "./FeasibilityPanel";
import { CircularDecisionPanel } from "./CircularDecisionPanel";
import { WorkflowTracker } from "./WorkflowTracker";
import { Countdown } from "./Countdown";
import { EventTimeline } from "./EventTimeline";
import { PhotoUploader, type UploadedPhoto } from "./PhotoUploader";
import { VerificationPanel } from "@/components/VerificationPanel";
import { ChallengePanel } from "@/components/ChallengePanel";
import { ReturnPhotoGrid, OriginalVsReturn } from "@/components/ReturnPhotos";
import type { VerificationAssessmentDTO } from "@/types/dto";

/** Best-effort browser geolocation for warehouse-proximity routing. */
function getPickupLocation(): Promise<{ lat: number; lng: number } | undefined> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { timeout: 8000 },
    );
  });
}

const REASONS = [
  "Size too small",
  "Size too large",
  "Color not as pictured",
  "Defective on arrival",
  "Changed my mind",
];

const TERMINAL = ["RETURNED_TO_SELLER", "COMPLETED", "TRANSFER_REJECTED", "LIQUIDATED", "DISCARDED"];

export function ReturnWorkflow() {
  const router = useRouter();
  const search = useSearchParams();

  // selection
  const [orders, setOrders] = useState<EligibleOrderDTO[]>([]);
  const [selected, setSelected] = useState<ItemDTO | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  // case
  const [rc, setRc] = useState<ReturnCaseDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [noBuyerYet, setNoBuyerYet] = useState(false);
  const [adminRequested, setAdminRequested] = useState(false);

  const { user } = useUser();

  useEffect(() => {
    apiClient.getOrders().then(setOrders).catch(() => undefined);
  }, []);

  // Resume the user's most recent in-progress return so the page survives reloads
  // AND account switches (e.g. hop to the admin to approve, then back) — and so it
  // reflects whatever the admin just did. Skipped when deep-linking a fresh return
  // or resuming a specific case via ?caseId=.
  useEffect(() => {
    if (search?.get("itemId") || search?.get("caseId")) return;
    let cancelled = false;
    apiClient
      .getReturnCases(user.id)
      .then((cases) => {
        if (cancelled) return;
        const active = cases.find((c) => !TERMINAL.includes(c.status));
        if (active) {
          setRc(active);
          setSelected(null);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user.id, search]);

  // Deep-link to a specific return case: ?caseId=… loads that case directly.
  useEffect(() => {
    const caseId = search?.get("caseId");
    if (!caseId) return;
    let cancelled = false;
    apiClient
      .getReturnCase(caseId)
      .then((c) => {
        if (cancelled) return;
        setRc(c);
        setSelected(null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [search]);

  // While a case is waiting on someone else (admin review, pickup, verification),
  // poll so the page live-updates — e.g. the moment an admin approves, the case
  // flips to GRADED and the Circular Decision Engine panel appears here.
  useEffect(() => {
    if (!rc) return;
    const pending = [
      "MANUAL_REVIEW",
      "EVIDENCE_REQUESTED",
      "BUYER_RESERVED",
      "SL_PICKUP_SCHEDULED",
      "DELIVERY_VERIFICATION",
      "RETURN_PICKUP_SCHEDULED",
      "DELIVERY_REJECTED_REVIEW",
    ].includes(rc.status);
    if (!pending) return;
    const id = rc.id;
    const t = setInterval(async () => {
      try {
        setRc(await apiClient.getReturnCase(id));
      } catch {
        /* ignore transient errors */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [rc?.id, rc?.status]);

  // Deep-link from "Your Orders": ?itemId=… pre-selects that item (skip the grid).
  useEffect(() => {
    const itemId = search?.get("itemId");
    if (!itemId || selected || orders.length === 0) return;
    const match = orders.find((o) => o.order.item?.id === itemId && o.returnEligible);
    if (match?.order.item) setSelected(match.order.item);
  }, [orders, search, selected]);

  const describe = (e: unknown) =>
    e instanceof ApiError ? `${e.message}` : e instanceof Error ? e.message : "Something went wrong";

  // Step 1: initiate → grade → analyze (the AI grading runs first, then feasibility)
  async function start() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      setBusyLabel("Locating pickup address…");
      const pickup = await getPickupLocation();

      setBusyLabel("Initiating return request…");
      const created = await apiClient.initiateReturnCase(selected.id, reason, pickup);
      setRc(created);

      setBusyLabel("Verifying the product & AI grading your photos…");
      const images = photos.map((p) => ({
        base64: p.base64,
        mimeType: p.mimeType,
        role: p.role,
      }));
      const graded = await apiClient.gradeCase(created.id, images);
      setRc(graded);

      // Once graded, the Circular Commerce Decision Engine takes over: the case
      // rests at GRADED and the decision panel auto-recommends the best route
      // (with confidence + reasoning), which you can accept, override, or
      // escalate. Cases parked at EVIDENCE_REQUESTED / MANUAL_REVIEW by the
      // pre-grade verification gate are handled by their own panels instead.
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

  // EVIDENCE_REQUESTED → seller adds clearer photos and re-runs the gate.
  async function resubmitEvidence() {
    if (!rc || photos.length === 0) return;
    setError(null);
    setBusy(true);
    setBusyLabel("Re-verifying with the new photos…");
    try {
      const images = photos.map((p) => ({ base64: p.base64, mimeType: p.mimeType, role: p.role }));
      const graded = await apiClient.gradeCase(rc.id, images);
      setRc(graded);
      // Graded → the Circular Decision Engine panel takes over (see start()).
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  // After repeated AI gate failures, escalate to a human (admin) verification.
  async function requestAdminVerify() {
    if (!rc) return;
    setError(null);
    setBusy(true);
    setBusyLabel("Sending to the Operations review team…");
    try {
      await apiClient.requestReturnVerification(rc.id, {
        reason:
          rc.status === "MANUAL_REVIEW"
            ? "AI flagged a potential fraud/mismatch"
            : "AI could not confirm the product match",
        comment: `Automated verification failed ${rc.verificationAttempts} time(s). Requesting a human review of the submitted photos.`,
      });
      setAdminRequested(true);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  async function refreshCase() {
    if (!rc) return;
    try {
      setRc(await apiClient.getReturnCase(rc.id));
    } catch {
      /* ignore */
    }
  }

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
            {orders
              .filter((o) => o.order.item)
              .map((o) => {
              const it = o.order.item!;
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
                <label className="mb-1 block text-sm font-semibold">
                  Photos for verification &amp; grading
                </label>
                <p className="mb-2 text-xs text-storm">
                  We first confirm the item matches what you purchased, then grade its condition.
                  Add clear front, back, side and packaging photos for the most accurate result.
                </p>
                <PhotoUploader photos={photos} onChange={setPhotos} />
              </div>
              {error && <ErrorState message={error} />}
              <Button size="lg" disabled={busy || photos.length === 0} onClick={start}>
                {busy ? busyLabel : "Verify, grade & analyze →"}
              </Button>
              {photos.length === 0 && (
                <p className="text-xs text-storm">Add at least one photo to continue.</p>
              )}
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
  const verification = latestVerification(rc);
  const needsEvidence = rc.status === "EVIDENCE_REQUESTED";
  const inManualReview = rc.status === "MANUAL_REVIEW";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Return Workflow</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-storm">Case {rc.id.slice(-6)}</span>
          <button
            onClick={() => {
              setRc(null);
              setSelected(null);
              setPhotos([]);
            }}
            className="text-xs font-medium text-link hover:underline"
          >
            + New return
          </button>
        </div>
      </div>
      <p className="text-sm text-storm">
        {rc.item.name} · {rc.item.category} · reason: {rc.reason}
      </p>

      <WorkflowTracker case={rc} />

      {busy && <LoadingState label={busyLabel} />}
      {error && <ErrorState message={error} />}

      {/* Photos the customer submitted (saved with the case) */}
      {rc.returnPhotos?.length > 0 && (
        <Card className="mt-4">
          <CardBody>
            <h2 className="mb-2 font-bold">Submitted photos</h2>
            <p className="mb-2 text-xs text-storm">
              These were saved with your return and are shared with the inspection team and the
              pickup partner.
            </p>
            <ReturnPhotoGrid photos={rc.returnPhotos} />
          </CardBody>
        </Card>
      )}

      {/* Pre-grade product verification */}
      {verification && (
        <div className="mt-4">
          <VerificationPanel
            verification={verification}
            finalGrade={rc.status === "GRADED" || f ? rc.grade : null}
            qualityConfidence={rc.gradeConfidence}
          />
        </div>
      )}

      {/* Verification gate: more evidence requested */}
      {needsEvidence && (
        <Card className="mt-4 border-warn/40">
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📷</span>
              <h2 className="font-bold">More evidence needed before grading</h2>
            </div>
            <p className="text-sm text-storm">
              We couldn&apos;t confidently confirm this is the product you purchased. Please add
              clearer, well-lit photos — front, back, side and the packaging/labels help most — and
              re-submit for verification.
            </p>
            <PhotoUploader photos={photos} onChange={setPhotos} />
            <Button disabled={busy || photos.length === 0} onClick={resubmitEvidence}>
              Re-submit evidence &amp; re-verify
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Verification gate: escalated to manual review */}
      {inManualReview && !rc.grade && (
        <Card className="mt-4 border-danger/40">
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔎</span>
              <h2 className="font-bold">Escalated to manual review</h2>
            </div>
            <p className="text-sm text-storm">
              This return has been automatically routed to our Operations Review team — they&apos;ll
              review your submitted photos and <span className="font-medium">accept or reject</span>{" "}
              it. You&apos;ll see the outcome here; track progress in the audit trail below.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Routing escalation: item is already graded but user escalated the route decision */}
      {inManualReview && rc.grade && (
        <Card className="mt-4 border-ember/40">
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧑‍⚖️</span>
              <h2 className="font-bold">Route escalated to Operations</h2>
            </div>
            <p className="text-sm text-storm">
              You escalated Nemo&apos;s route recommendation. The Operations team is reviewing your
              case and will choose the best second-life path. You&apos;ll see the outcome here.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Show the Circular Decision Engine panel even in MANUAL_REVIEW if graded
          (so the user can see what Nemo recommended before escalation) — read-only */}
      {rc.grade && inManualReview && (
        <CircularDecisionPanel caseId={rc.id} onApplied={refreshCase} readOnly />
      )}

      {/* Escalation: low product-match after repeated tries → offer admin verification.
          (MANUAL_REVIEW/fraud cases are auto-escalated above, so only EVIDENCE_REQUESTED here.) */}
      {needsEvidence && rc.verificationAttempts >= 3 && (
        <Card className="mt-4 border-link/40">
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧑‍⚖️</span>
              <h2 className="font-bold">Still can&apos;t verify automatically?</h2>
            </div>
            <p className="text-sm text-storm">
              Our AI couldn&apos;t confirm this item after {rc.verificationAttempts} attempts. If
              it&apos;s genuine, request a human verification — the Amazon Nemo Operations team will
              review your submitted photos and accept or reject the request.
            </p>
            {adminRequested ? (
              <div className="rounded bg-link/10 p-2 text-sm text-link">
                ✅ Sent to the Operations review team. You&apos;ll see the outcome here once they
                accept or reject.{" "}
                <button onClick={refreshCase} className="font-medium underline">
                  Check status
                </button>
              </div>
            ) : (
              <Button disabled={busy} onClick={requestAdminVerify}>
                Request admin verification
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {/* Circular Commerce Decision Engine — the auto route recommendation */}
      {rc.grade &&
        ["GRADED", "FEASIBILITY_ANALYZED", "SECOND_LIFE_LISTED"].includes(rc.status) && (
          <CircularDecisionPanel caseId={rc.id} onApplied={refreshCase} />
        )}

      {/* Decision + feasibility (supporting detail) */}
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
              {rc.reservedBuyerId && (
                <p className="rounded bg-success/10 p-2 text-sm text-success">
                  ✅ An interested buyer was found nearby and the item is reserved. For privacy,
                  the buyer&apos;s identity and location are not shared with you — our delivery
                  partner handles the handover.
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

      {/* #26: donation classification — user chooses donate or discard */}
      {rc.status === "DONATION_PENDING" && (
        <Card className="mt-4 border-success/40">
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              <h2 className="font-bold">This item is classified for donation</h2>
            </div>
            <p className="text-sm text-storm">
              It still works but isn&apos;t economical to resell. You can donate it through Amazon
              to a partner charity (and earn green credits), or discard this request and keep the
              item.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() => act("Donating through Amazon…", () => apiClient.donationDecision(rc.id, "donate"))}
              >
                Donate through Amazon
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => act("Discarding request…", () => apiClient.donationDecision(rc.id, "discard"))}
              >
                Discard request (keep item)
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Delivery-partner verification: compare the item to how it was delivered */}
      {inVerification && (
        <Card className="mt-4 border-link/40">
          <CardBody className="space-y-2">
            <h2 className="font-bold">📦 Pickup verification</h2>
            <p className="text-xs text-storm">
              Confirm the collected item matches the original delivered product and isn&apos;t a
              different or defective piece, then approve or reject the transfer.
            </p>
            <OriginalVsReturn
              originalImageUrl={rc.item.imageUrl}
              category={rc.item.category}
              photos={rc.returnPhotos ?? []}
            />
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
                    : rc.status === "DISCARDED"
                      ? "🗑️"
                      : rc.disposition === "DONATED"
                        ? "🎁"
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

      {/* AI-verdict challenge / dispute (available once a grade exists) */}
      {rc.grade != null && rc.status !== "EVIDENCE_REQUESTED" && (
        <ChallengePanel returnCaseId={rc.id} aiGrade={rc.grade} />
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
      return rc.disposition === "DONATED" ? "Donated through Amazon 🎁" : "Routed to disposition flow";
    case "DISCARDED":
      return "Donation request discarded — item kept by customer";
    default:
      return rc.status;
  }
}

/** Pull the most recent verification assessment out of the case's event trail. */
function latestVerification(rc: ReturnCaseDTO): VerificationAssessmentDTO | null {
  for (let i = rc.events.length - 1; i >= 0; i--) {
    const v = (rc.events[i].data as { verification?: VerificationAssessmentDTO } | null)
      ?.verification;
    if (v) return v;
  }
  return null;
}
