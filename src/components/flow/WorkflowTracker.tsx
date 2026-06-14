import type { ReturnCaseDTO, ReturnStatusDTO } from "@/types/dto";
import { cn } from "@/lib/cn";

const LABELS: Record<ReturnStatusDTO, string> = {
  INITIATED: "Initiated",
  VERIFYING: "Verifying",
  EVIDENCE_REQUESTED: "Evidence Requested",
  MANUAL_REVIEW: "Manual Review",
  GRADED: "AI Graded",
  FEASIBILITY_ANALYZED: "Feasibility",
  RETURN_APPROVED: "Approved",
  RETURN_PICKUP_SCHEDULED: "Pickup",
  RETURNED_TO_SELLER: "Returned",
  SECOND_LIFE_LISTED: "2nd-Life Listed",
  BUYER_RESERVED: "Buyer Reserved",
  SL_PICKUP_SCHEDULED: "Pickup",
  DELIVERY_VERIFICATION: "Verification",
  TRANSFER_APPROVED: "Approved",
  REFUND_INITIATED: "Refund",
  COMPLETED: "Completed",
  TRANSFER_REJECTED: "Rejected",
  WINDOW_EXPIRED: "Window Expired",
  LIQUIDATION_PICKUP: "Pickup",
  LIQUIDATED: "Disposition",
  DONATION_PENDING: "Donation?",
  DISCARDED: "Discarded",
};

/** Builds the milestone path actually taken by this case. */
function milestones(rc: ReturnCaseDTO): ReturnStatusDTO[] {
  const reached = new Set(rc.events.map((e) => e.status));

  // Parked at the verification gate — short path reflecting the held state.
  if (rc.status === "EVIDENCE_REQUESTED") return ["INITIATED", "EVIDENCE_REQUESTED"];
  if (rc.status === "MANUAL_REVIEW") return ["INITIATED", "MANUAL_REVIEW"];

  const path: ReturnStatusDTO[] = ["INITIATED", "GRADED", "FEASIBILITY_ANALYZED"];

  if (rc.decision === "FEASIBLE") {
    path.push("RETURN_APPROVED", "RETURN_PICKUP_SCHEDULED", "RETURNED_TO_SELLER");
  } else if (rc.decision === "NOT_FEASIBLE") {
    path.push("SECOND_LIFE_LISTED");
    const liquidation =
      reached.has("WINDOW_EXPIRED") ||
      reached.has("LIQUIDATION_PICKUP") ||
      reached.has("LIQUIDATED") ||
      reached.has("DONATION_PENDING");
    if (liquidation) {
      path.push("WINDOW_EXPIRED");
      if (reached.has("DONATION_PENDING") || reached.has("DISCARDED")) {
        path.push("DONATION_PENDING");
        if (reached.has("DISCARDED")) path.push("DISCARDED");
        else path.push("LIQUIDATION_PICKUP", "LIQUIDATED");
      } else {
        path.push("LIQUIDATION_PICKUP", "LIQUIDATED");
      }
    } else {
      path.push("BUYER_RESERVED", "SL_PICKUP_SCHEDULED", "DELIVERY_VERIFICATION");
      if (reached.has("TRANSFER_REJECTED")) {
        path.push("TRANSFER_REJECTED");
      } else {
        path.push("TRANSFER_APPROVED", "REFUND_INITIATED", "COMPLETED");
      }
    }
  }
  return path;
}

export function WorkflowTracker({ case: rc }: { case: ReturnCaseDTO }) {
  const reached = new Set(rc.events.map((e) => e.status));
  const path = milestones(rc);
  const isRejection = rc.status === "TRANSFER_REJECTED";

  return (
    <ol className="mt-4 flex flex-wrap items-center gap-y-2 rounded bg-white p-3">
      {path.map((status, i) => {
        const current = status === rc.status;
        const done = reached.has(status) && !current;
        const rejectNode = status === "TRANSFER_REJECTED";
        return (
          <li key={`${status}-${i}`} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  current && (isRejection || rejectNode ? "bg-danger text-white" : "bg-zest text-ink"),
                  done && !rejectNode && "bg-success text-white",
                  done && rejectNode && "bg-danger text-white",
                  !done && !current && "bg-mist text-storm",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-xs",
                  current ? "font-bold text-ink" : done ? "text-ink" : "text-storm",
                )}
              >
                {LABELS[status]}
              </span>
            </div>
            {i < path.length - 1 && <span className="mx-2 h-px w-5 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}
