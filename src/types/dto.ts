import type { Grade, RoutingPath, DetectedFlaw, ProductHealthCard } from "@/types";

/**
 * Client-facing DTOs — the JSON shapes the API actually returns (dates as
 * strings, etc.). The typed API client and the screens speak these types.
 */

export interface GradeResultDTO {
  grade: Grade;
  confidence: number;
  flaws: DetectedFlaw[];
  summary: string;
  gradedBy: "bedrock" | "local";
  tookMs: number;
}

export interface RuleCandidateDTO {
  path: RoutingPath;
  score: number;
  reasoning: string;
}

export interface RoutingResultDTO {
  path: RoutingPath;
  score: number;
  reasoning: string;
  inputs: {
    grade: Grade;
    category: string;
    relistingCost: number;
    resaleValue: number;
    nearbyDemandCount: number;
    repairability: number;
  };
  considered: RuleCandidateDTO[];
}

export interface PriceResultDTO {
  price: number;
  pricePct: number;
  reasoning: string;
}

export interface ListingDTO {
  id: string;
  itemId: string;
  title: string;
  description: string;
  price: number;
  pricePct: number;
  photoUrl: string | null;
  status: "ACTIVE" | "RESERVED" | "SOLD" | "INACTIVE";
  healthCard: ProductHealthCard;
  createdAt: string;
  item?: ItemDTO;
}

export interface ItemDTO {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  originalPrice: number;
  currentGrade: Grade | null;
  status: string;
  repairability: number;
}

export interface BuyerMatchDTO {
  buyerId: string;
  name: string;
  distanceKm: number;
  lat: number;
  lng: number;
}

export interface MatchResultDTO {
  matches: BuyerMatchDTO[];
  count: number;
}

export interface PreventionResultDTO {
  message: string;
  confidence: number;
  topReason: string | null;
  sampleSize: number;
}

export interface CreditTotalsDTO {
  totalCredits: number;
  totalCo2SavedKg: number;
  totalCostSaved: number;
  count: number;
  totalRedeemed: number;
  availableBalance: number;
}

export interface RewardDTO {
  id: string;
  label: string;
  description: string;
  cost: number;
  icon: string;
  kind: "voucher" | "perk" | "donation";
}

export interface RedeemResultDTO {
  redemption: {
    id: string;
    rewardId: string;
    rewardLabel: string;
    cost: number;
    code: string;
    createdAt: string;
  };
  totals: CreditTotalsDTO;
}

export interface RedemptionDTO {
  id: string;
  code: string;
  rewardId: string;
  rewardLabel: string;
  cost: number;
  createdAt: string;
  description: string;
  redeemUrl: string;
  redeemAt: string;
  kind: "voucher" | "perk" | "donation";
}

export interface EligibleOrderDTO {
  order: {
    id: string;
    itemId: string;
    userId: string;
    orderedAt: string;
    deliveredAt: string | null;
    status: string;
    item: ItemDTO;
  };
  returnEligible: boolean;
  returnDaysLeft: number;
  returnWindowDays: number;
  reasonIfNot?: string;
}

export interface CreditsResultDTO {
  credits: number;
  co2SavedKg: number;
  costSaved: number;
  record: {
    id: string;
    action: RoutingPath;
    credits: number;
    co2SavedKg: number;
    costSaved: number;
    createdAt: string;
  };
  totals: CreditTotalsDTO;
}

export interface ReturnDTO {
  id: string;
  itemId: string;
  reason: string;
  photos: string[];
  createdAt: string;
}

export interface CheckoutResultDTO {
  orderRef: string;
  itemCount: number;
  creditsEarned: number;
  co2SavedKg: number;
  costSaved: number;
  totals: CreditTotalsDTO;
}

// ── Return workflow ──
export interface FeasibilityDTO {
  originalValue: number;
  estimatedCurrentValue: number;
  pickupCost: number;
  transportationCost: number;
  warehouseHandlingCost: number;
  inspectionCost: number;
  repackagingCost: number;
  storageCost: number;
  totalProcessingCost: number;
  expectedResaleValue: number;
  netRecoveryValue: number;
  recoveryRatio: number;
  distanceKm: number;
  decision: "FEASIBLE" | "NOT_FEASIBLE";
  reasoning: string;
}

export type ReturnStatusDTO =
  | "INITIATED"
  | "GRADED"
  | "FEASIBILITY_ANALYZED"
  | "RETURN_APPROVED"
  | "RETURN_PICKUP_SCHEDULED"
  | "RETURNED_TO_SELLER"
  | "SECOND_LIFE_LISTED"
  | "BUYER_RESERVED"
  | "SL_PICKUP_SCHEDULED"
  | "DELIVERY_VERIFICATION"
  | "TRANSFER_APPROVED"
  | "REFUND_INITIATED"
  | "COMPLETED"
  | "TRANSFER_REJECTED"
  | "WINDOW_EXPIRED"
  | "LIQUIDATION_PICKUP"
  | "LIQUIDATED";

export interface ReturnEventDTO {
  id: string;
  status: ReturnStatusDTO;
  message: string;
  data?: unknown;
  createdAt: string;
}

export interface ReturnCaseDTO {
  id: string;
  userId: string;
  itemId: string;
  orderId: string | null;
  reason: string;
  status: ReturnStatusDTO;
  decision: "FEASIBLE" | "NOT_FEASIBLE" | null;
  grade: Grade | null;
  feasibility: FeasibilityDTO | null;
  secondLifeListingId: string | null;
  secondLifeDeadline: string | null;
  reservedBuyerId: string | null;
  reservedBuyerName: string | null;
  reservedDistanceKm: number | null;
  verificationApproved: boolean | null;
  verificationNotes: string | null;
  rejectionReason: string | null;
  disposition: string | null;
  refundInitiatedAt: string | null;
  refundAmount: number | null;
  createdAt: string;
  updatedAt: string;
  item: ItemDTO;
  events: ReturnEventDTO[];
}
