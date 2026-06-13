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
