import type { ProductCategory, ReturnRoute } from "./reloop";

export type MockItem = {
  id: string;
  title: string;
  brand: string;
  category: ProductCategory;
  size: string;
  region: string;
  reason: string;
  status: "DRAFT" | "GRADED" | "ROUTED" | "LISTED" | "SOLD" | "COMPLETED";
  route: ReturnRoute | null;
  grade: "A" | "B" | "C" | "D" | null;
  conditionScore: number;
  qualityScore: number;
  historyScore: number;
  confidence: number;
  greenCredits: number;
  imageUrls: string[];
  createdAt: string;
  originalPrice: number | null;
  estimatedPrice: number | null;
};

export type PassportData = {
  id: string;
  serialHash: string;
  productTitle: string;
  brand: string;
  category: ProductCategory;
  materialNotes: string[];
  ownerCount: number;
  repairEvents: Array<{
    date: string;
    type: string;
    description: string;
    postGrade: "A" | "B" | "C" | "D";
  }>;
  cityTrail: string[];
  gradeHistory: Array<{
    date: string;
    grade: "A" | "B" | "C" | "D";
    conditionScore: number;
    route: ReturnRoute;
  }>;
  carbonSaved: number;
};

export type NeedSignalData = {
  id: string;
  region: string;
  category: ProductCategory;
  size: string | null;
  urgency: number;
  pool: string;
  active: boolean;
  demandLevel: "High" | "Medium" | "Low";
  distanceKm: number;
  matchScore: number;
};

export const mockItems: MockItem[] = [
  {
    id: "ret-001",
    title: "AeroStride Velocity Running Shoes",
    brand: "AeroStride",
    category: "FOOTWEAR",
    size: "UK7",
    region: "North Bengaluru",
    reason: "Size is too tight",
    status: "ROUTED",
    route: "RESALE",
    grade: "A",
    conditionScore: 92,
    qualityScore: 88,
    historyScore: 85,
    confidence: 88,
    greenCredits: 30,
    imageUrls: ["/mock/shoe-1.jpg", "/mock/shoe-2.jpg"],
    createdAt: "2026-06-10T09:30:00Z",
    originalPrice: 4999,
    estimatedPrice: 3499,
  },
  {
    id: "ret-002",
    title: "KitchenPro Mixer Grinder 750W",
    brand: "KitchenPro",
    category: "ELECTRONICS",
    size: "",
    region: "Koramangala",
    reason: "Jar capacity smaller than expected",
    status: "ROUTED",
    route: "REFURBISH",
    grade: "B",
    conditionScore: 74,
    qualityScore: 68,
    historyScore: 72,
    confidence: 71,
    greenCredits: 30,
    imageUrls: ["/mock/mixer-1.jpg"],
    createdAt: "2026-06-09T14:15:00Z",
    originalPrice: 3299,
    estimatedPrice: 1649,
  },
  {
    id: "ret-003",
    title: "FlexBeam Study Lamp",
    brand: "FlexBeam",
    category: "HOME",
    size: "",
    region: "Indiranagar",
    reason: "Not bright enough for room",
    status: "ROUTED",
    route: "DONATE",
    grade: "C",
    conditionScore: 58,
    qualityScore: 62,
    historyScore: 55,
    confidence: 58,
    greenCredits: 40,
    imageUrls: ["/mock/lamp-1.jpg", "/mock/lamp-2.jpg", "/mock/lamp-3.jpg"],
    createdAt: "2026-06-08T11:00:00Z",
    originalPrice: 1299,
    estimatedPrice: null,
  },
  {
    id: "ret-004",
    title: "CloudWalk Canvas Sneakers",
    brand: "CloudWalk",
    category: "FOOTWEAR",
    size: "UK8",
    region: "North Bengaluru",
    reason: "Duplicate order, unused",
    status: "ROUTED",
    route: "PEER_EXCHANGE",
    grade: "A",
    conditionScore: 96,
    qualityScore: 90,
    historyScore: 88,
    confidence: 91,
    greenCredits: 45,
    imageUrls: ["/mock/sneaker-1.jpg", "/mock/sneaker-2.jpg"],
    createdAt: "2026-06-11T16:45:00Z",
    originalPrice: 2499,
    estimatedPrice: 1749,
  },
  {
    id: "ret-005",
    title: "TechGear Wireless Earbuds Pro",
    brand: "TechGear",
    category: "ELECTRONICS",
    size: "",
    region: "HSR Layout",
    reason: "Left earbud dead on arrival",
    status: "ROUTED",
    route: "LIQUIDATE",
    grade: "D",
    conditionScore: 28,
    qualityScore: 42,
    historyScore: 35,
    confidence: 35,
    greenCredits: 10,
    imageUrls: ["/mock/earbuds-1.jpg"],
    createdAt: "2026-06-07T08:20:00Z",
    originalPrice: 5999,
    estimatedPrice: null,
  },
  {
    id: "ret-006",
    title: "StoryTime Picture Books Bundle",
    brand: "StoryTime",
    category: "BOOKS",
    size: "",
    region: "Whitefield",
    reason: "Gift duplicate, already have set",
    status: "LISTED",
    route: "RESALE",
    grade: "A",
    conditionScore: 95,
    qualityScore: 92,
    historyScore: 90,
    confidence: 92,
    greenCredits: 30,
    imageUrls: ["/mock/books-1.jpg", "/mock/books-2.jpg"],
    createdAt: "2026-06-06T10:00:00Z",
    originalPrice: 1599,
    estimatedPrice: 1119,
  },
];

export const mockPassports: PassportData[] = [
  {
    id: "pass-001",
    serialHash: "rl-a7f3c2e1",
    productTitle: "AeroStride Velocity Running Shoes",
    brand: "AeroStride",
    category: "FOOTWEAR",
    materialNotes: ["Synthetic mesh upper", "EVA foam midsole", "Rubber outsole"],
    ownerCount: 2,
    repairEvents: [],
    cityTrail: ["Bengaluru", "Mysuru"],
    gradeHistory: [
      { date: "2026-06-10", grade: "A", conditionScore: 92, route: "RESALE" },
    ],
    carbonSaved: 4.2,
  },
  {
    id: "pass-002",
    serialHash: "rl-b8d4e5f2",
    productTitle: "KitchenPro Mixer Grinder 750W",
    brand: "KitchenPro",
    category: "ELECTRONICS",
    materialNotes: ["Stainless steel blades", "ABS plastic body", "Copper motor windings"],
    ownerCount: 1,
    repairEvents: [
      { date: "2026-06-12", type: "Motor inspection", description: "Motor tested and verified functional. Jar seal replaced.", postGrade: "B" },
    ],
    cityTrail: ["Bengaluru"],
    gradeHistory: [
      { date: "2026-06-09", grade: "B", conditionScore: 74, route: "REFURBISH" },
    ],
    carbonSaved: 3.1,
  },
  {
    id: "pass-003",
    serialHash: "rl-c9e5f6a3",
    productTitle: "CloudWalk Canvas Sneakers",
    brand: "CloudWalk",
    category: "FOOTWEAR",
    materialNotes: ["Cotton canvas upper", "Vulcanized rubber sole", "Organic cotton laces"],
    ownerCount: 2,
    repairEvents: [],
    cityTrail: ["Bengaluru", "Bengaluru"],
    gradeHistory: [
      { date: "2026-06-11", grade: "A", conditionScore: 96, route: "PEER_EXCHANGE" },
    ],
    carbonSaved: 4.5,
  },
];

export const mockNeedSignals: NeedSignalData[] = [
  {
    id: "ns-001",
    region: "North Bengaluru",
    category: "FOOTWEAR",
    size: "UK8",
    urgency: 8,
    pool: "North Bengaluru footwear pool",
    active: true,
    demandLevel: "High",
    distanceKm: 3.4,
    matchScore: 82,
  },
  {
    id: "ns-002",
    region: "Koramangala",
    category: "APPAREL",
    size: "M",
    urgency: 6,
    pool: "Koramangala apparel pool",
    active: true,
    demandLevel: "Medium",
    distanceKm: 4.8,
    matchScore: 67,
  },
  {
    id: "ns-003",
    region: "Whitefield",
    category: "BOOKS",
    size: null,
    urgency: 9,
    pool: "City library reuse pool",
    active: true,
    demandLevel: "High",
    distanceKm: 6.1,
    matchScore: 74,
  },
  {
    id: "ns-004",
    region: "HSR Layout",
    category: "ELECTRONICS",
    size: null,
    urgency: 4,
    pool: "E-waste recovery program",
    active: true,
    demandLevel: "Low",
    distanceKm: 8.2,
    matchScore: 38,
  },
  {
    id: "ns-005",
    region: "Indiranagar",
    category: "HOME",
    size: null,
    urgency: 7,
    pool: "Community home essentials",
    active: true,
    demandLevel: "Medium",
    distanceKm: 2.1,
    matchScore: 71,
  },
  {
    id: "ns-006",
    region: "Jayanagar",
    category: "TOYS",
    size: null,
    urgency: 5,
    pool: "Children's play center",
    active: false,
    demandLevel: "Low",
    distanceKm: 5.5,
    matchScore: 45,
  },
];

export const mockMetrics = {
  totalProcessed: 1247,
  routeDistribution: {
    RESALE: 34.2,
    REFURBISH: 18.7,
    DONATE: 22.1,
    LIQUIDATE: 12.8,
    PEER_EXCHANGE: 12.2,
  },
  totalCarbonSaved: 4892.3,
  totalGreenCredits: 38540,
  avgGradeConfidence: 74,
  weeklyVolume: [182, 195, 210, 188, 203, 221, 198],
};
