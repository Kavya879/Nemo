import type {
  AdminAnalyticsDTO,
  AdminCaseDetailDTO,
  AdminCaseRowDTO,
  AdminConfigDTO,
  AdminMapDTO,
  AdminPreventionDTO,
  BuyerMatchDTO,
  CategoryCountDTO,
  ChallengeDTO,
  ProductIntelligenceDTO,
  PurchaseAdvisorDTO,
  CartAssessmentDTO,
  AlternativeItemDTO,
  ReviewDTO,
  CheckoutResultDTO,
  CreditTotalsDTO,
  CreditsResultDTO,
  EligibleOrderDTO,
  GradeResultDTO,
  GradeWithVerificationDTO,
  ItemDTO,
  ListingDTO,
  ProductDTO,
  ReturnDealDTO,
  NotificationDTO,
  DeliveryBoardDTO,
  MatchResultDTO,
  PreventionResultDTO,
  PriceResultDTO,
  RedeemResultDTO,
  RedemptionDTO,
  ReturnCaseDTO,
  ReturnDTO,
  RewardDTO,
  RoutingResultDTO,
} from "@/types/dto";
import type { Grade, RoutingPath, DetectedFlaw } from "@/types";
import { currentUserId, getCurrentUser } from "@/lib/session";

export interface ChallengeEvidenceInput {
  data: string;
  mimeType?: string;
  role?: string;
  note?: string;
}

/**
 * The typed API client — the SINGLE place the frontend talks to the backend.
 * Screens never call `fetch` directly; they use this client. Every method is
 * typed against the API's response DTOs and throws a typed ApiError on failure.
 *
 * Uses relative URLs in the browser, so it works regardless of host/port.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface SuccessEnvelope<T> {
  ok: true;
  apiVersion: string;
  data: T;
}
interface ErrorEnvelope {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

// Base URL: empty (relative) in the browser; configured origin on the server.
const BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
    : "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (e) {
    throw new ApiError(
      e instanceof Error ? e.message : "Network request failed",
      0,
      "NETWORK_ERROR",
    );
  }

  let json: SuccessEnvelope<T> | ErrorEnvelope;
  try {
    json = (await res.json()) as SuccessEnvelope<T> | ErrorEnvelope;
  } catch {
    throw new ApiError("Malformed response from server.", res.status, "BAD_RESPONSE");
  }

  if (!json.ok) {
    throw new ApiError(json.error.message, res.status, json.error.code, json.error.details);
  }
  return json.data;
}

export type ImageRoleInput = "front" | "back" | "side" | "packaging" | "defect" | "other";

export interface GradeImageInput {
  base64: string;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  role?: ImageRoleInput;
}

export interface RoutingContextInput {
  grade: Grade;
  category: string;
  relistingCost: number;
  resaleValue: number;
  nearbyDemandCount: number;
  repairability: number;
}

export const apiClient = {
  health: () => request<{ status: string; db: string }>("/api/health"),

  getItems: () => request<ItemDTO[]>("/api/items"),

  getCategories: () => request<CategoryCountDTO[]>("/api/catalog/categories"),

  // ── Return-prevention intelligence ──
  getProductIntelligence: (listingOrItemId: string, userId: string = currentUserId()) =>
    request<ProductIntelligenceDTO>(
      `/api/intelligence/product/${listingOrItemId}?userId=${encodeURIComponent(userId)}`,
    ),
  getAlternatives: (listingOrItemId: string, userId: string = currentUserId()) =>
    request<AlternativeItemDTO[]>(
      `/api/intelligence/alternatives/${listingOrItemId}?userId=${encodeURIComponent(userId)}`,
    ),
  recordView: (itemId: string, listingId?: string) =>
    request<{ recorded: boolean }>("/api/intelligence/view", {
      method: "POST",
      body: JSON.stringify({ itemId, listingId, userId: currentUserId() }),
    }),
  getReviews: (itemId: string) =>
    request<{ reviews: ReviewDTO[]; aggregate: { count: number; avgRating: number | null; avgSentiment: number | null; scoredCount: number } }>(
      `/api/reviews?itemId=${encodeURIComponent(itemId)}`,
    ),
  addReview: (input: { itemId: string; rating: number; title?: string; body: string; authorName?: string }) =>
    request<ReviewDTO>("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ ...input, userId: currentUserId() }),
    }),
  getPurchaseAdvisor: (userId: string = currentUserId()) =>
    request<PurchaseAdvisorDTO>(`/api/intelligence/advisor?userId=${encodeURIComponent(userId)}`),
  assessCart: (
    lines: Array<{ listingId: string; itemId: string; category: string; originalPrice: number; title?: string }>,
  ) =>
    request<CartAssessmentDTO>("/api/intelligence/cart", {
      method: "POST",
      body: JSON.stringify({ userId: currentUserId(), lines }),
    }),

  createItem: (input: {
    name: string;
    category: string;
    brand?: string;
    originalPrice: number;
    repairability?: number;
    imageUrl?: string;
  }) =>
    request<ItemDTO>("/api/items", { method: "POST", body: JSON.stringify(input) }),

  cancelReturn: (itemId: string, userId: string = currentUserId()) =>
    request<{ cancelled: boolean }>("/api/returns/cancel", {
      method: "POST",
      body: JSON.stringify({ itemId, userId }),
    }),

  cancelOrder: (orderId: string) =>
    request<{ id: string; status: string }>(`/api/orders/${orderId}/cancel`, {
      method: "POST",
    }),

  getRedemptions: (userId: string = currentUserId()) =>
    request<RedemptionDTO[]>(
      `/api/credits/redemptions?userId=${encodeURIComponent(userId)}`,
    ),

  // ── Return decision workflow ──
  initiateReturnCase: (
    itemId: string,
    reason: string,
    pickup?: { lat: number; lng: number },
  ) =>
    request<ReturnCaseDTO>("/api/return-cases", {
      method: "POST",
      body: JSON.stringify({
        itemId,
        reason,
        userId: currentUserId(),
        ...(pickup ? { pickupLat: pickup.lat, pickupLng: pickup.lng } : {}),
      }),
    }),
  getReturnCase: (id: string) => request<ReturnCaseDTO>(`/api/return-cases/${id}`),
  gradeCase: (id: string, images: GradeImageInput[]) =>
    request<ReturnCaseDTO>(`/api/return-cases/${id}/grade`, {
      method: "POST",
      body: JSON.stringify({ images }),
    }),
  analyzeCase: (id: string) =>
    request<ReturnCaseDTO>(`/api/return-cases/${id}/analyze`, { method: "POST" }),
  completePickup: (id: string) =>
    request<ReturnCaseDTO>(`/api/return-cases/${id}/complete-pickup`, { method: "POST" }),
  rejectPickup: (id: string, reason: string) =>
    request<ReturnCaseDTO>(`/api/return-cases/${id}/reject-pickup`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  findBuyerForCase: (id: string) =>
    request<{ found: boolean; case: ReturnCaseDTO }>(
      `/api/return-cases/${id}/find-buyer`,
      { method: "POST" },
    ),
  verifyTransfer: (id: string, approved: boolean, notes?: string) =>
    request<ReturnCaseDTO>(`/api/return-cases/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ approved, notes }),
    }),
  expireWindow: (id: string, force?: boolean) =>
    request<ReturnCaseDTO>(`/api/return-cases/${id}/expire`, {
      method: "POST",
      body: JSON.stringify({ force }),
    }),
  donationDecision: (id: string, action: "donate" | "discard") =>
    request<ReturnCaseDTO>(`/api/return-cases/${id}/donation-decision`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  // ── AI-verdict challenge / dispute ──
  openChallenge: (
    returnCaseId: string,
    input: { reason: string; comment: string; evidence?: ChallengeEvidenceInput[] },
  ) => {
    const u = getCurrentUser();
    return request<ChallengeDTO>(`/api/return-cases/${returnCaseId}/challenge`, {
      method: "POST",
      body: JSON.stringify({ ...input, userId: u.id, userName: u.name }),
    });
  },
  getMyChallenges: (userId: string = currentUserId()) =>
    request<ChallengeDTO[]>(`/api/challenges?userId=${encodeURIComponent(userId)}`),
  getChallenge: (id: string) => request<ChallengeDTO>(`/api/challenges/${id}`),
  addChallengeEvidence: (
    id: string,
    input: { comment?: string; evidence?: ChallengeEvidenceInput[] },
  ) =>
    request<ChallengeDTO>(`/api/challenges/${id}`, {
      method: "POST",
      body: JSON.stringify({
        actor: getCurrentUser().name,
        bySeller: true,
        comment: input.comment,
        evidence: input.evidence ?? [],
      }),
    }),

  // ── Admin: challenge review ──
  adminChallenges: () => request<ChallengeDTO[]>("/api/admin/challenges"),
  adminChallenge: (id: string) => request<ChallengeDTO>(`/api/admin/challenges/${id}`),
  adminAssignChallenge: (id: string) =>
    request<ChallengeDTO>(`/api/admin/challenges/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "assign", reviewer: getCurrentUser().name }),
    }),
  adminRequestChallengeInfo: (id: string, message: string) =>
    request<ChallengeDTO>(`/api/admin/challenges/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "requestInfo", reviewer: getCurrentUser().name, message }),
    }),
  adminResolveChallenge: (
    id: string,
    input: {
      resolution: "UPHOLD" | "MODIFY" | "OVERRIDE" | "REJECT";
      revisedGrade?: Grade;
      reasoning: string;
    },
  ) =>
    request<ChallengeDTO>(`/api/admin/challenges/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "resolve", reviewer: getCurrentUser().name, ...input }),
    }),
  /** Accept/reject a verification escalation (return or sell). */
  adminDecideChallenge: (id: string, input: { decision: "ACCEPT" | "REJECT"; reasoning: string }) =>
    request<ChallengeDTO>(`/api/admin/challenges/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "decide", reviewer: getCurrentUser().name, ...input }),
    }),

  // ── Request human (admin) verification after repeated AI gate failures ──
  requestReturnVerification: (caseId: string, input: { reason: string; comment: string }) => {
    const u = getCurrentUser();
    return request<ChallengeDTO>(`/api/return-cases/${caseId}/request-verification`, {
      method: "POST",
      body: JSON.stringify({ ...input, userId: u.id, userName: u.name }),
    });
  },
  requestSellVerification: (
    itemId: string,
    input: {
      reason: string;
      comment: string;
      intendedPrice: number;
      intendedPricePct: number;
      evidence?: ChallengeEvidenceInput[];
    },
  ) => {
    const u = getCurrentUser();
    return request<ChallengeDTO>(`/api/items/${itemId}/request-verification`, {
      method: "POST",
      body: JSON.stringify({ ...input, userId: u.id, userName: u.name }),
    });
  },

  // ── Admin console ──
  adminCases: () => request<AdminCaseRowDTO[]>("/api/admin/return-cases"),
  adminCaseDetail: (id: string) =>
    request<AdminCaseDetailDTO>(`/api/admin/return-cases/${id}`),
  adminMap: (coords?: { lat: number; lng: number }) =>
    request<AdminMapDTO>(
      `/api/admin/map${coords ? `?lat=${coords.lat}&lng=${coords.lng}` : ""}`,
    ),
  adminAnalytics: () => request<AdminAnalyticsDTO>("/api/admin/analytics"),
  adminPrevention: () => request<AdminPreventionDTO[]>("/api/admin/prevention"),
  adminConfig: () => request<AdminConfigDTO>("/api/admin/config"),
  adminUpdateConfig: (patch: Record<string, number>) =>
    request<AdminConfigDTO>("/api/admin/config", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  adminSetListingStatus: (id: string, status: "ACTIVE" | "INACTIVE") =>
    request<{ id: string; status: string }>(`/api/admin/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getOrders: (userId: string = currentUserId()) =>
    request<EligibleOrderDTO[]>(`/api/orders?userId=${encodeURIComponent(userId)}`),

  getRewards: () => request<RewardDTO[]>("/api/rewards"),

  checkout: (
    lines: Array<{
      kind: "NEW" | "RESOLD" | "TRANSIT";
      listingId?: string;
      itemId?: string;
      productId?: string;
      returnCaseId?: string;
      category: string;
      originalPrice: number;
      qty: number;
    }>,
  ) =>
    request<CheckoutResultDTO>("/api/checkout", {
      method: "POST",
      body: JSON.stringify({ lines, userId: currentUserId() }),
    }),

  redeem: (rewardId: string, userId: string = currentUserId()) =>
    request<RedeemResultDTO>("/api/credits/redeem", {
      method: "POST",
      body: JSON.stringify({ rewardId, userId }),
    }),

  createReturn: (input: { itemId: string; reason: string; photos?: string[] }) =>
    request<ReturnDTO>("/api/returns", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  grade: (images: GradeImageInput[], itemId?: string) =>
    request<GradeWithVerificationDTO>("/api/grade", {
      method: "POST",
      body: JSON.stringify({ images, itemId }),
    }),

  routeItem: (context: RoutingContextInput, itemId?: string) =>
    request<RoutingResultDTO>("/api/route-item", {
      method: "POST",
      body: JSON.stringify({ context, itemId }),
    }),

  price: (input: {
    grade: Grade;
    originalPrice: number;
    category: string;
    demandCount?: number;
  }) =>
    request<PriceResultDTO>("/api/pricing", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createListing: (input: {
    itemId: string;
    grade: Grade;
    confidence: number;
    flaws: DetectedFlaw[];
    price: number;
    pricePct: number;
    photoUrl?: string | null;
    history?: string[];
  }) =>
    request<ListingDTO>("/api/listings", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getListings: () => request<ListingDTO[]>("/api/listings"),

  getListing: (id: string) => request<ListingDTO>(`/api/listings/${id}`),

  // ── Brand-new catalog (standard inventory ecosystem) ──
  getProducts: () => request<ProductDTO[]>("/api/products"),

  getProduct: (id: string) => request<ProductDTO>(`/api/products/${id}`),

  // ── Return-in-Transit deals (early sale from the return pipeline) ──
  getReturnDeals: () => request<ReturnDealDTO[]>("/api/return-deals"),

  // ── User notifications (activity feed) ──
  getNotifications: (userId: string = currentUserId()) =>
    request<NotificationDTO[]>(`/api/notifications?userId=${encodeURIComponent(userId)}`),

  // ── Delivery partner board ──
  getDeliveryTasks: () => request<DeliveryBoardDTO>("/api/delivery/tasks"),

  match: (category: string, lat: number, lng: number, radiusKm?: number) => {
    const q = new URLSearchParams({
      category,
      lat: String(lat),
      lng: String(lng),
      ...(radiusKm ? { radiusKm: String(radiusKm) } : {}),
    });
    return request<MatchResultDTO>(`/api/match?${q.toString()}`);
  },

  prevention: (category: string, profile?: Record<string, string>) => {
    const q = new URLSearchParams({ category });
    if (profile) q.set("profile", JSON.stringify(profile));
    return request<PreventionResultDTO>(`/api/prevention?${q.toString()}`);
  },

  awardCredits: (input: {
    action: RoutingPath;
    category: string;
    originalPrice: number;
    userId?: string;
    itemId?: string;
  }) =>
    request<CreditsResultDTO>("/api/credits", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getCreditTotals: (userId: string = currentUserId()) =>
    request<CreditTotalsDTO>(`/api/credits?userId=${encodeURIComponent(userId)}`),
};

// Re-export for convenience
export type { BuyerMatchDTO, ListingDTO, GradeResultDTO, RoutingResultDTO };
