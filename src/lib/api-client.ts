import type {
  BuyerMatchDTO,
  CreditTotalsDTO,
  CreditsResultDTO,
  EligibleOrderDTO,
  GradeResultDTO,
  ItemDTO,
  ListingDTO,
  MatchResultDTO,
  PreventionResultDTO,
  PriceResultDTO,
  RedeemResultDTO,
  RedemptionDTO,
  ReturnDTO,
  RewardDTO,
  RoutingResultDTO,
} from "@/types/dto";
import type { Grade, RoutingPath, DetectedFlaw } from "@/types";

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

export interface GradeImageInput {
  base64: string;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
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

  createItem: (input: {
    name: string;
    category: string;
    brand?: string;
    originalPrice: number;
    repairability?: number;
  }) =>
    request<ItemDTO>("/api/items", { method: "POST", body: JSON.stringify(input) }),

  cancelReturn: (itemId: string, userId?: string) =>
    request<{ cancelled: boolean }>("/api/returns/cancel", {
      method: "POST",
      body: JSON.stringify({ itemId, userId }),
    }),

  getRedemptions: (userId?: string) =>
    request<RedemptionDTO[]>(
      `/api/credits/redemptions${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`,
    ),

  getOrders: (userId?: string) =>
    request<EligibleOrderDTO[]>(
      `/api/orders${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`,
    ),

  getRewards: () => request<RewardDTO[]>("/api/rewards"),

  redeem: (rewardId: string, userId?: string) =>
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
    request<GradeResultDTO>("/api/grade", {
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

  getCreditTotals: (userId?: string) =>
    request<CreditTotalsDTO>(
      `/api/credits${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`,
    ),
};

// Re-export for convenience
export type { BuyerMatchDTO, ListingDTO, GradeResultDTO, RoutingResultDTO };
