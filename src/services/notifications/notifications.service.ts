import { challengeRepository, type ChallengeWithRelations } from "@/repositories/challenge.repository";
import { returnCaseRepository, type ReturnCaseWithRelations } from "@/repositories/return-case.repository";

/**
 * Notifications — a per-user activity feed DERIVED from existing data (no extra
 * table, no write-hooks): the outcome of verification/dispute challenges they
 * raised, and the lifecycle of their returns (incl. when a returned or in-transit
 * item is bought). Always reflects current state because it's computed on read.
 */

export interface NotificationItem {
  id: string;
  type: "challenge" | "return" | "sale";
  title: string;
  message: string;
  icon: string;
  level: "info" | "success" | "warning";
  href?: string;
  createdAt: string; // ISO
}

const iso = (d: Date | null | undefined): string => (d ? new Date(d).toISOString() : new Date(0).toISOString());

function fromChallenge(c: ChallengeWithRelations): NotificationItem | null {
  const itemName = c.returnCase?.item.name ?? c.item.name;
  const isVerification = c.kind !== "GRADE_DISPUTE";
  const when = iso(c.resolvedAt ?? c.updatedAt);
  const reason = c.resolutionReasoning ? ` ${c.resolutionReasoning}` : "";

  if (c.status === "RESOLVED_OVERRIDDEN" || c.status === "RESOLVED_MODIFIED" || c.status === "RESOLVED_UPHELD") {
    return {
      id: `ch-${c.id}`,
      type: "challenge",
      icon: "✅",
      level: "success",
      title: isVerification ? "Verification approved" : "Dispute resolved",
      message: isVerification
        ? `Your verification request for “${itemName}” was accepted — the item is approved.${reason}`
        : `Your dispute for “${itemName}” was resolved${c.revisedGrade ? ` → Grade ${c.revisedGrade}` : ""}.${reason}`,
      href: "/orders",
      createdAt: when,
    };
  }
  if (c.status === "REJECTED") {
    return {
      id: `ch-${c.id}`,
      type: "challenge",
      icon: "❌",
      level: "warning",
      title: isVerification ? "Verification rejected" : "Dispute rejected",
      message: `Your ${isVerification ? "verification" : "dispute"} request for “${itemName}” was rejected.${reason}`,
      href: "/orders",
      createdAt: when,
    };
  }
  if (c.status === "NEEDS_MORE_INFO") {
    return {
      id: `ch-${c.id}-info`,
      type: "challenge",
      icon: "📝",
      level: "info",
      title: "More info requested",
      message: `Our reviewer asked for more information on your request for “${itemName}”.`,
      href: "/orders",
      createdAt: iso(c.updatedAt),
    };
  }
  if (c.status === "UNDER_REVIEW") {
    return {
      id: `ch-${c.id}-rev`,
      type: "challenge",
      icon: "🔎",
      level: "info",
      title: "Request under review",
      message: `Your request for “${itemName}” is being reviewed by our Operations team.`,
      href: "/orders",
      createdAt: iso(c.updatedAt),
    };
  }
  return null; // OPEN → nothing to notify yet
}

function fromReturnCase(rc: ReturnCaseWithRelations): NotificationItem[] {
  const out: NotificationItem[] = [];
  const name = rc.item.name;

  // Sold early as a Return-in-Transit deal.
  if (rc.transitSold) {
    out.push({
      id: `rc-${rc.id}-transit`,
      type: "sale",
      icon: "🛍️",
      level: "success",
      title: "Your item sold (in transit)",
      message: `Good news — your returned “${name}” was bought early by a nearby buyer.`,
      href: "/orders",
      createdAt: iso(rc.transitReservedAt ?? rc.updatedAt),
    });
  }

  switch (rc.status) {
    case "COMPLETED":
      out.push({
        id: `rc-${rc.id}`,
        type: "sale",
        icon: "🎉",
        level: "success",
        title: "Second-life sale completed",
        message: `Your returned “${name}” sold to a nearby buyer${rc.refundAmount ? ` and a refund of ₹${rc.refundAmount.toLocaleString("en-IN")} was initiated` : ""}.`,
        href: "/orders",
        createdAt: iso(rc.refundInitiatedAt ?? rc.updatedAt),
      });
      break;
    case "BUYER_RESERVED":
    case "SL_PICKUP_SCHEDULED":
    case "DELIVERY_VERIFICATION":
      out.push({
        id: `rc-${rc.id}`,
        type: "return",
        icon: "📦",
        level: "info",
        title: "A buyer was found",
        message: `A nearby buyer reserved your returned “${name}” — pickup is being arranged.`,
        href: "/return",
        createdAt: iso(rc.updatedAt),
      });
      break;
    case "SECOND_LIFE_LISTED":
      out.push({
        id: `rc-${rc.id}`,
        type: "return",
        icon: "🔁",
        level: "info",
        title: "Listed for second-life buyers",
        message: `Your returned “${name}” is now listed for nearby buyers.`,
        href: rc.secondLifeListingId ? `/marketplace/${rc.secondLifeListingId}` : "/return",
        createdAt: iso(rc.updatedAt),
      });
      break;
    case "RETURNED_TO_SELLER":
      out.push({
        id: `rc-${rc.id}`,
        type: "return",
        icon: "📦",
        level: "info",
        title: "Return completed",
        message: `Your “${name}” was returned to the seller. Your refund is on its way.`,
        href: "/orders",
        createdAt: iso(rc.updatedAt),
      });
      break;
    case "MANUAL_REVIEW":
      out.push({
        id: `rc-${rc.id}`,
        type: "return",
        icon: "🔎",
        level: "info",
        title: "Return under manual review",
        message: `Your return for “${name}” is being reviewed by our Operations team — you'll be notified of the outcome.`,
        href: "/return",
        createdAt: iso(rc.updatedAt),
      });
      break;
    case "TRANSFER_REJECTED":
    case "DISCARDED":
      out.push({
        id: `rc-${rc.id}`,
        type: "return",
        icon: "❌",
        level: "warning",
        title: "Return not approved",
        message: `Your return for “${name}” was not approved.${rc.rejectionReason ? ` ${rc.rejectionReason}` : ""}`,
        href: "/return",
        createdAt: iso(rc.updatedAt),
      });
      break;
    default:
      break;
  }
  return out;
}

export const notificationsService = {
  async listForUser(userId = "demo-user"): Promise<NotificationItem[]> {
    const [challenges, cases] = await Promise.all([
      challengeRepository.listForUser(userId),
      returnCaseRepository.listForUser(userId),
    ]);

    const items: NotificationItem[] = [
      ...challenges.map(fromChallenge).filter((n): n is NotificationItem => n !== null),
      ...cases.flatMap(fromReturnCase),
    ];

    return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
};
