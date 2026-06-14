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
  gradedBy: "bedrock" | "local" | "clip";
  tookMs: number;
  productMatchConfidence?: number | null;
  fraudRiskScore?: number | null;
}

// ── Pre-grade product verification ──
export interface VerificationAssessmentDTO {
  productMatchConfidence: number;
  fraudRiskScore: number;
  attributes: {
    category: number;
    brand: number;
    model: number;
    packaging: number;
    visual: number;
  };
  deviations: { attribute: string; detail: string; severity: "minor" | "moderate" | "severe" }[];
  recommendation: "PROCEED" | "REQUEST_EVIDENCE" | "MANUAL_REVIEW";
  verifiedBy: "bedrock" | "clip" | "local";
  imageRoles: string[];
  summary: string;
  tookMs: number;
}

/** Combined response of POST /api/grade. */
export interface GradeWithVerificationDTO {
  verification: VerificationAssessmentDTO | null;
  grade: GradeResultDTO;
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
  /** Compact return-risk indicator for listing cards (computed by the engine). */
  returnRiskLevel?: "low" | "medium" | "high";
  returnRiskScore?: number;
  /** Real customer-review rating for listing cards — null when there are none. */
  avgRating?: number | null;
  reviewCount?: number;
}

export interface ItemDTO {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  originalPrice: number;
  imageUrl: string | null;
  currentGrade: Grade | null;
  status: string;
  repairability: number;
}

/** A Return-in-Transit deal — an item sold early from the return pipeline. */
export interface ReturnDealDTO {
  returnCaseId: string;
  itemId: string;
  name: string;
  category: string;
  brand: string | null;
  imageUrl: string | null;
  originalPrice: number;
  discountPct: number; // 0..1
  discountedPrice: number;
  daysInPipeline: number;
  estimatedArrival: string; // ISO date
  badge: "In Return Pipeline" | "Arriving Soon" | "Smart Deal";
}

/** A single user-facing notification (derived activity-feed item). */
export interface NotificationDTO {
  id: string;
  type: "challenge" | "return" | "sale";
  title: string;
  message: string;
  icon: string;
  level: "info" | "success" | "warning";
  href?: string;
  createdAt: string;
}

/** A task on a delivery partner's daily route (derived from active return cases). */
export interface DeliveryTaskDTO {
  caseId: string;
  itemName: string;
  category: string;
  brand: string | null;
  originalImageUrl: string | null;
  returnPhotos: { data: string; mimeType: string; role: string }[];
  reason: string;
  /** RETURN_PICKUP = collect from customer → seller; VERIFY_EXCHANGE = collect + verify → buyer. */
  kind: "RETURN_PICKUP" | "VERIFY_EXCHANGE" | "DROP";
  status: string;
  fromLabel: string;
  toLabel: string;
  distanceKm: number | null;
  grade: Grade | null;
  lat: number;
  lng: number;
  locationLabel: string;
  createdAt: string;
}

export interface DeliveryBoardDTO {
  pickups: DeliveryTaskDTO[];
  completed: DeliveryTaskDTO[];
  stats: { pickups: number; completed: number };
}

export type StockStatusDTO = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

/** A brand-new catalog product (standard inventory ecosystem). */
export interface ProductDTO {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  description: string;
  price: number;
  imageUrl: string | null;
  stock: number;
  soldCount: number;
  active: boolean;
  createdAt: string;
  /** Derived availability (from real stock — single source of truth). */
  stockStatus: StockStatusDTO;
  stockLabel: string;
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

/** A brand-new product as embedded in an order line. */
export interface OrderProductDTO {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  price: number;
  imageUrl: string | null;
}

export interface EligibleOrderDTO {
  order: {
    id: string;
    itemId: string | null;
    productId: string | null;
    quantity: number;
    userId: string;
    orderedAt: string;
    deliveredAt: string | null;
    status: string;
    /** Set for resold (second-life) orders. */
    item: ItemDTO | null;
    /** Set for brand-new product orders. */
    product: OrderProductDTO | null;
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

export interface CategoryCountDTO {
  category: string;
  total: number;
  activeListings: number;
}

// ── Return-prevention intelligence ──
export type RiskLevelDTO = "low" | "medium" | "high";

export interface ReturnRiskDTO {
  itemId: string;
  score: number; // 0..100 (higher = riskier)
  level: RiskLevelDTO;
  confidence: number; // 0..1
  reasons: string[];
}

export interface PassportMetricDTO {
  score: number; // 0..100
  confidence: number;
  label: string;
}

export interface ProductPassportDTO {
  itemId: string;
  qualityScore: PassportMetricDTO | null;
  durabilityPrediction: PassportMetricDTO | null;
  returnRate: PassportMetricDTO | null;
  sellerReliability: PassportMetricDTO | null;
  sustainabilityScore: PassportMetricDTO | null;
  customerSatisfaction: PassportMetricDTO | null;
  authenticityConfidence: PassportMetricDTO | null;
  resaleValue: { amount: number; pct: number; confidence: number; label: string } | null;
}

export interface ReviewDTO {
  id: string;
  authorName: string | null;
  rating: number;
  title: string | null;
  body: string;
  sentiment: number | null;
  createdAt: string;
}

export interface ReviewSummaryDTO {
  count: number;
  avgRating: number | null;
  avgSentiment: number | null;
  positive: ReviewDTO | null;
  critical: ReviewDTO | null;
  expectationMismatch: { value: number; confidence: number; reason: string };
}

export interface DigitalTwinDTO {
  purchaseSuccessScore: number;
  satisfactionProbability: number;
  returnProbability: number;
  confidence: number;
  riskFactors: string[];
  recommendation: string;
}

export interface CohortInsightDTO {
  keptRate: number;
  sampleSize: number;
  confidence: number;
  reason: string;
}

export interface OwnershipInsightsDTO {
  predictedLifespanMonths: number;
  costPerYear: number;
  regretProbability: number | null;
  regretLevel: "low" | "medium" | "high" | null;
}

export interface CompatibilityCheckDTO {
  dimension: string;
  status: "ok" | "review" | "info" | "unknown";
  detail: string;
}

export interface CompatibilityResultDTO {
  overall: "ok" | "review" | "unknown";
  checks: CompatibilityCheckDTO[];
}

export interface AlternativeItemDTO {
  listingId: string;
  itemId: string;
  title: string;
  price: number;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  reason: string;
}

export interface ProductIntelligenceDTO {
  itemId: string;
  returnRisk: ReturnRiskDTO;
  passport: ProductPassportDTO;
  twin: DigitalTwinDTO | null;
  cohort: CohortInsightDTO;
  ownership: OwnershipInsightsDTO;
  compatibility: CompatibilityResultDTO;
  reviews: ReviewSummaryDTO;
}

export interface PurchaseAdvisorDTO {
  userId: string;
  ordersCount: number;
  returnsCount: number;
  returnRate: number;
  riskProfile: "low" | "medium" | "high";
  topReasons: { reason: string; count: number }[];
  topCategories: { category: string; count: number }[];
  recommendations: string[];
  confidence: number;
}

export interface CartLineAssessmentDTO {
  listingId: string;
  itemId: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  duplicate: boolean;
  wrongPurchase: boolean;
  note?: string;
}

export interface CartAssessmentDTO {
  lines: CartLineAssessmentDTO[];
  confidenceMeter: number;
  warnings: string[];
}

// ── AI-verdict challenge / dispute ──
export type ChallengeStatusDTO =
  | "OPEN"
  | "UNDER_REVIEW"
  | "NEEDS_MORE_INFO"
  | "RESOLVED_UPHELD"
  | "RESOLVED_MODIFIED"
  | "RESOLVED_OVERRIDDEN"
  | "REJECTED";

export interface ChallengeSnapshotDTO {
  grade: Grade | null;
  gradeConfidence: number | null;
  productMatchConfidence: number | null;
  fraudRiskScore: number | null;
  flaws: DetectedFlaw[];
  gradeSummary: string | null;
  gradedBy: string | null;
  verification: {
    productMatchConfidence: number;
    fraudRiskScore: number;
    attributes: { category: number; brand: number; model: number; packaging: number; visual: number };
    deviations: { attribute: string; detail: string; severity: string }[];
    recommendation: string;
    verifiedBy: string;
  } | null;
  /** Sell-flow verification only: the seller's intended listing price. */
  intendedPrice?: number | null;
  intendedPricePct?: number | null;
  capturedAt: string;
}

export interface ChallengeEvidenceDTO {
  id: string;
  data: string;
  mimeType: string;
  role: string;
  note: string | null;
  addedBy: string;
  createdAt: string;
}

export interface ChallengeEventDTO {
  id: string;
  status: ChallengeStatusDTO;
  message: string;
  actor: string;
  data?: unknown;
  createdAt: string;
}

export interface ChallengeDTO {
  id: string;
  returnCaseId: string | null;
  itemId: string;
  /** "GRADE_DISPUTE" | "RETURN_VERIFICATION" | "SELL_VERIFICATION". */
  kind: string;
  openedByUserId: string;
  openedByName: string | null;
  status: ChallengeStatusDTO;
  reason: string;
  sellerComment: string;
  snapshot: ChallengeSnapshotDTO;
  assignedTo: string | null;
  resolution: "UPHOLD" | "MODIFY" | "OVERRIDE" | "REJECT" | null;
  revisedGrade: Grade | null;
  resolutionReasoning: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  evidence: ChallengeEvidenceDTO[];
  events: ChallengeEventDTO[];
  /** Always present — every challenge links to an item. */
  item: ItemDTO;
  /** Present for return-flow challenges; null for Sell-flow escalations. */
  returnCase: {
    id: string;
    status: string;
    reason: string;
    grade: Grade | null;
    item: ItemDTO;
  } | null;
}

// ── Admin console ──
export interface AdminCaseRowDTO {
  id: string;
  itemName: string;
  category: string;
  brand: string | null;
  originalPrice: number;
  imageUrl: string | null;
  grade: Grade | null;
  confidence: number | null;
  status: string;
  decision: "FEASIBLE" | "NOT_FEASIBLE" | null;
  disposition: string | null;
  pathLabel: string;
  reservedBuyerName: string | null;
  reservedDistanceKm: number | null;
  expectedResaleValue: number | null;
  netRecoveryValue: number | null;
  createdAt: string;
}

export interface AdminCaseDetailDTO {
  case: {
    id: string;
    itemName: string;
    category: string;
    brand: string | null;
    originalPrice: number;
    grade: Grade | null;
    confidence: number | null;
    status: string;
    decision: "FEASIBLE" | "NOT_FEASIBLE" | null;
    disposition: string | null;
    reason: string;
    reservedBuyerName: string | null;
    reservedDistanceKm: number | null;
    pathLabel: string;
    imageUrl: string | null;
    productMatchConfidence: number | null;
    fraudRiskScore: number | null;
    returnPhotos: { data: string; mimeType: string; role: string }[];
  };
  feasibility: FeasibilityDTO | null;
  routing: RoutingResultDTO;
  nearbyDemandCount: number;
  events: { status: string; message: string; createdAt: string }[];
}

export interface AdminMapDTO {
  origin: { lat: number; lng: number };
  radiusKm: number;
  nearestWarehouse: { name: string; distanceKm: number };
  warehouses: { name: string; city: string; lat: number; lng: number }[];
  buyers: { id: string; name: string; lat: number; lng: number; wishlist: string[] }[];
  returns: {
    id: string;
    itemName: string;
    category: string;
    status: string;
    pathLabel: string;
    matched: boolean;
    buyer: { name: string; lat: number; lng: number; distanceKm: number | null } | null;
  }[];
}

export interface AdminAnalyticsDTO {
  totalReturns: number;
  divertedFromLandfill: number;
  recycled: number;
  co2SavedKg: number;
  costSaved: number;
  creditsIssued: number;
  secondLifeActions: number;
  avgGradingMs: number;
  underTwoSecPct: number;
  pathBreakdown: { label: string; count: number }[];
}

export interface AdminPreventionDTO {
  category: string;
  sampleSize: number;
  topReason: string;
  topPct: number;
  reasons: { reason: string; count: number }[];
  nudge: string;
}

export interface AdminConfigDTO {
  matchRadiusKm: number;
  feasibilityRatio: number;
  warehouseProximityKm: number;
  peerToPeerMinBuyers: number;
  repairabilityThreshold: number;
  returnWindowDays: number;
  minNetRecoveryValue: number;
  demandPriceMultiplier: number;
  transportCostPerKm: number;
  verificationMatchThreshold: number;
  fraudRiskThreshold: number;
  minQualityConfidence: number;
  priceBands: unknown;
  creditsPerAction: unknown;
  gradeDefaultRoutes: unknown;
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
  nearestWarehouse?: string;
  proximityFeasible?: boolean;
  decision: "FEASIBLE" | "NOT_FEASIBLE";
  reasoning: string;
}

export type ReturnStatusDTO =
  | "INITIATED"
  | "VERIFYING"
  | "EVIDENCE_REQUESTED"
  | "MANUAL_REVIEW"
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
  | "LIQUIDATED"
  | "DONATION_PENDING"
  | "DISCARDED";

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
  gradeConfidence: number | null;
  verificationAttempts: number;
  pickupLat: number | null;
  pickupLng: number | null;
  returnPhotos: { data: string; mimeType: string; role: string }[];
  verificationResultId: string | null;
  productMatchConfidence: number | null;
  fraudRiskScore: number | null;
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
