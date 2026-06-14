/**
 * Non-secret, non-business application constants.
 *
 * IMPORTANT: Business rules (thresholds, rates, radii, grade cutoffs, CO₂
 * factors, price bands) do NOT live here — they live in the `RoutingConfig`
 * table in the database so they can be changed live without a redeploy.
 *
 * Only stable, code-level constants belong in this file.
 */

/** Singleton key for the global config row in the RoutingConfig table. */
export const CONFIG_SINGLETON_KEY = "default";

/** Redis key prefixes for the nearby-buyer wishlist index. */
export const REDIS_KEYS = {
  /** Sorted/spatial index of buyers, e.g. wishlist:<category>. */
  wishlistByCategory: (category: string) => `wishlist:cat:${category}`,
  /** Hash of buyer metadata for fast hydration. */
  buyer: (buyerId: string) => `buyer:${buyerId}`,
} as const;

/** The fixed set of routing paths a decision can resolve to. */
export const ROUTING_PATHS = [
  "RESELL_AS_IS",
  "REFURBISH",
  "PEER_TO_PEER",
  "DONATE",
  "RECYCLE",
] as const;

/** The fixed set of condition grades. */
export const GRADES = ["A", "B", "C", "D"] as const;

/**
 * Charity partners for the Donate flow. Stable app config (not a secret), so it
 * lives here. Each carries a human "impact" line shown on the donation certificate.
 */
export interface Charity {
  id: string;
  name: string;
  focus: string;
  icon: string;
  impact: string;
}
export const CHARITY_PARTNERS: Charity[] = [
  { id: "goonj", name: "Goonj", focus: "Clothing & daily essentials for rural communities", icon: "🧥", impact: "Helps clothe a family in need" },
  { id: "robinhood", name: "Robin Hood Army", focus: "Food & supplies for the underserved", icon: "🍱", impact: "Provides meals to those in need" },
  { id: "smile", name: "Smile Foundation", focus: "Education, books & devices for children", icon: "📚", impact: "Gives a child learning tools" },
  { id: "ewaste", name: "Certified e-Recycler", focus: "Responsible recycling & safe disposal", icon: "♻️", impact: "Keeps e-waste out of landfill" },
];

/**
 * Canonical selling categories always offered in the Sell flow and filters,
 * regardless of what the live catalog currently contains. "Others" is always
 * available as a catch-all so sellers are never blocked by a missing category.
 */
export const CANONICAL_CATEGORIES = [
  "Electronics",
  "Apparel",
  "Footwear",
  "Home",
  "Kitchenware",
  "Books",
  "Toys",
  "Furniture",
  "Beauty",
  "Sports",
  "Others",
] as const;

/** Standard API response envelope version. */
export const API_VERSION = "1.0";

/** Earth radius in kilometers, for haversine distance. */
export const EARTH_RADIUS_KM = 6371;

/**
 * Demo customer location (Bengaluru). In production this comes from the order's
 * shipping address (or live geolocation); centralized so it isn't sprinkled around.
 */
export const CUSTOMER_LOCATION = { lat: 12.9716, lng: 77.5946 };

/**
 * Real Amazon India fulfillment-center locations (publicly-known, city-level
 * coordinates). Reverse-logistics distance is measured to the NEAREST of these,
 * and they're shown on the admin matching map.
 */
export interface Warehouse {
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export const WAREHOUSES: Warehouse[] = [
  { name: "Amazon FC BLR (Hoskote)", city: "Bengaluru", lat: 13.0716, lng: 77.7173 },
  { name: "Amazon FC HYD", city: "Hyderabad", lat: 17.4399, lng: 78.3776 },
  { name: "Amazon FC BOM (Bhiwandi)", city: "Mumbai", lat: 19.2967, lng: 73.0631 },
  { name: "Amazon FC DEL (Manesar)", city: "Delhi NCR", lat: 28.3927, lng: 76.9645 },
  { name: "Amazon FC MAA (Sriperumbudur)", city: "Chennai", lat: 12.9675, lng: 79.943 },
  { name: "Amazon FC CCU", city: "Kolkata", lat: 22.58, lng: 88.3639 },
  { name: "Amazon FC AMD", city: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Amazon FC PNQ (Chakan)", city: "Pune", lat: 18.76, lng: 73.84 },
  { name: "Amazon FC JAI", city: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Amazon FC LKO", city: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Amazon FC CJB", city: "Coimbatore", lat: 11.0168, lng: 76.9558 },
];

/**
 * Reward catalog for redeeming Green Credits. Stable app config (not a secret,
 * not a per-tenant business rule), so it lives here.
 */
export interface Reward {
  id: string;
  label: string;
  description: string;
  cost: number; // credits required
  icon: string;
  kind: "voucher" | "perk" | "donation";
  /** Prefix for the issued coupon code. */
  codePrefix: string;
  /** Where the coupon can be redeemed. */
  redeemUrl: string;
  /** Short label for the redeem destination. */
  redeemAt: string;
}

export const REWARDS: Reward[] = [
  {
    id: "voucher-100",
    label: "₹100 off",
    description: "₹100 voucher toward your next Amazon Nemo order. Apply at checkout.",
    cost: 100,
    icon: "🎟️",
    kind: "voucher",
    codePrefix: "AN100",
    redeemUrl: "/marketplace",
    redeemAt: "Amazon Nemo Marketplace",
  },
  {
    id: "voucher-250",
    label: "₹250 off",
    description: "₹250 voucher toward your next Amazon Nemo order. Apply at checkout.",
    cost: 250,
    icon: "🎟️",
    kind: "voucher",
    codePrefix: "AN250",
    redeemUrl: "/marketplace",
    redeemAt: "Amazon Nemo Marketplace",
  },
  {
    id: "free-delivery",
    label: "Free delivery (30 days)",
    description: "Unlimited free delivery for a month. Apply at checkout.",
    cost: 150,
    icon: "🚚",
    kind: "perk",
    codePrefix: "ANSHIP",
    redeemUrl: "/marketplace",
    redeemAt: "Amazon Nemo Marketplace",
  },
  {
    id: "plant-tree",
    label: "Plant a tree",
    description: "We plant a tree on your behalf via our reforestation partner.",
    cost: 80,
    icon: "🌳",
    kind: "donation",
    codePrefix: "ANTREE",
    redeemUrl: "https://www.grow-trees.com",
    redeemAt: "Grow-Trees (partner)",
  },
];

/**
 * Local-grader grade cutoffs (config, not magic numbers): maps the offline
 * grader's 0..1 image-condition score onto a grade. Evaluated top-down.
 */
export const LOCAL_GRADER_GRADE_CUTOFFS: Array<{
  min: number;
  grade: "A" | "B" | "C" | "D";
}> = [
  { min: 0.85, grade: "A" },
  { min: 0.6, grade: "B" },
  { min: 0.35, grade: "C" },
  { min: 0, grade: "D" },
];
