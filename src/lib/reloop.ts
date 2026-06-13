export type ProductCategory =
  | "APPAREL"
  | "FOOTWEAR"
  | "ELECTRONICS"
  | "HOME"
  | "TOYS"
  | "BOOKS"
  | "OTHER";

export type ReturnRoute =
  | "RESALE"
  | "REFURBISH"
  | "DONATE"
  | "LIQUIDATE"
  | "PEER_EXCHANGE";

export type ReturnDraft = {
  title: string;
  brand: string;
  category: ProductCategory;
  size: string;
  region: string;
  reason: string;
  details: string;
  imageCount: number;
};

export type HealthCard = {
  grade: "A" | "B" | "C" | "D";
  conditionScore: number;
  qualityScore: number;
  historyScore: number;
  confidence: number;
  route: ReturnRoute;
  routeLabel: string;
  routeReason: string;
  nextAction: string;
  riskFlags: string[];
  greenCredits: number;
  needMatch?: NeedMatch;
};

export type NeedMatch = {
  pool: string;
  distanceKm: number;
  demand: "High" | "Medium" | "Low";
  note: string;
};

export type SellerInsight = {
  listingId: string;
  title: string;
  repeatIssue: string;
  returnCount: number;
  revisedTitle: string;
  revisedCopy: string;
  preventionTip: string;
};

const routeLabels: Record<ReturnRoute, string> = {
  RESALE: "Resell now",
  REFURBISH: "Refurbish first",
  DONATE: "Donate locally",
  LIQUIDATE: "Liquidate responsibly",
  PEER_EXCHANGE: "Route to nearby need"
};

const needPools: Array<NeedMatch & { category: ProductCategory; size?: string }> = [
  {
    category: "FOOTWEAR",
    size: "UK8",
    pool: "North Bengaluru footwear pool",
    distanceKm: 3.4,
    demand: "High",
    note: "Anonymous demand from verified student and gig-worker programs."
  },
  {
    category: "APPAREL",
    size: "M",
    pool: "Koramangala apparel pool",
    distanceKm: 4.8,
    demand: "Medium",
    note: "Matched to recurring need signals; handoff handled by Amazon pickup."
  },
  {
    category: "BOOKS",
    pool: "City library reuse pool",
    distanceKm: 6.1,
    demand: "High",
    note: "Bulk drop route available without exposing customer details."
  }
];

const routeCopy: Record<ReturnRoute, { reason: string; action: string }> = {
  RESALE: {
    reason: "The item looks clean, complete, and easy to verify for resale.",
    action: "Seal it for pickup; ReLoop will relist it after identity-safe inspection."
  },
  REFURBISH: {
    reason: "The item has enough value to recover, but needs a quality intervention first.",
    action: "Send it to the nearest refurbishment node before relisting."
  },
  DONATE: {
    reason: "The item is useful, but resale confidence is lower than community value.",
    action: "Route it to a verified donation partner on the next reverse-logistics run."
  },
  LIQUIDATE: {
    reason: "The item is damaged or incomplete enough that direct reuse is unlikely.",
    action: "Bundle it for liquidation or parts recovery with sustainability tracking."
  },
  PEER_EXCHANGE: {
    reason: "Nearby anonymous demand is stronger than marketplace resale demand.",
    action: "Use Amazon-managed pickup and dropoff; no customer-to-customer contact needed."
  }
};

export function gradeReturn(draft: ReturnDraft): HealthCard {
  const text = `${draft.reason} ${draft.details}`.toLowerCase();
  const severe = scoreMatches(text, ["broken", "cracked", "dead", "missing", "fake", "torn"]);
  const mild = scoreMatches(text, ["small", "minor", "box", "opened", "scratch", "loose"]);
  const fit = scoreMatches(text, ["small", "tight", "large", "size", "fit", "uk"]);
  const unused = scoreMatches(text, ["unused", "new", "sealed", "wrong", "duplicate", "gift"]);
  const imageSignal = Math.min(draft.imageCount * 5, 15);

  const conditionScore = clamp(88 + imageSignal + unused * 4 - severe * 22 - mild * 7, 12, 98);
  const qualityScore = clamp(82 + imageSignal - severe * 16 - fit * 4, 18, 96);
  const historyScore = clamp(78 + unused * 5 - severe * 10 - mild * 3, 20, 94);
  const confidence = Math.round((conditionScore + qualityScore + historyScore) / 3);
  const grade = confidence >= 86 ? "A" : confidence >= 70 ? "B" : confidence >= 52 ? "C" : "D";
  const needMatch = findNeedMatch(draft);
  const route = chooseRoute({ draft, grade, conditionScore, qualityScore, needMatch, severe });
  const copy = routeCopy[route];

  return {
    grade,
    conditionScore,
    qualityScore,
    historyScore,
    confidence,
    route,
    routeLabel: routeLabels[route],
    routeReason: copy.reason,
    nextAction: copy.action,
    riskFlags: buildRiskFlags({ text, severe, fit, draft, imageSignal }),
    greenCredits: route === "LIQUIDATE" ? 10 : route === "PEER_EXCHANGE" ? 45 : route === "DONATE" ? 40 : 30,
    needMatch: route === "PEER_EXCHANGE" ? needMatch : undefined
  };
}

export function generateSellerInsights(): SellerInsight[] {
  return [
    {
      listingId: "shoe-velocity-7",
      title: "AeroStride Velocity Running Shoes",
      repeatIssue: "Size runs small for UK7 buyers",
      returnCount: 28,
      revisedTitle: "AeroStride Velocity Running Shoes - choose one size up for a relaxed fit",
      revisedCopy:
        "Lightweight daily running shoes with a narrow performance fit. If you usually wear UK7, choose UK8 in this brand. Wide-foot customers should size up or choose the wide-fit variant.",
      preventionTip: "Add a pre-check: If you wear UK7, choose UK8 for this brand."
    },
    {
      listingId: "mixer-pro-jar",
      title: "KitchenPro Mixer Grinder 750W",
      repeatIssue: "Photos hide jar capacity and plug type",
      returnCount: 17,
      revisedTitle: "KitchenPro 750W Mixer Grinder with 1.5L jar and India 3-pin plug",
      revisedCopy:
        "Includes 1.5L blending jar, 1L dry jar, 0.4L chutney jar, and India 3-pin plug. The motor base is 21cm tall and fits under most kitchen cabinets.",
      preventionTip: "Show jar scale, plug photo, and counter-height dimensions before checkout."
    },
    {
      listingId: "desk-lamp-flex",
      title: "FlexBeam Study Lamp",
      repeatIssue: "Brightness expectations mismatch",
      returnCount: 14,
      revisedTitle: "FlexBeam Study Lamp - focused desk light, not a room light",
      revisedCopy:
        "Best for desk reading and laptop work. Covers a 90cm workspace with three brightness levels; not designed to illuminate an entire room.",
      preventionTip: "Ask buyers whether they need desk lighting or room lighting before purchase."
    }
  ];
}

export function sizeRecommendation(brand: string, currentSize: string, category: ProductCategory) {
  const normalizedBrand = brand.trim().toLowerCase();
  if (category === "FOOTWEAR" && normalizedBrand.includes("aerostride") && currentSize.toUpperCase() === "UK7") {
    return "If you wear UK7, choose UK8 for this brand.";
  }

  if (category === "APPAREL" && ["slim", "performance", "active"].some((word) => normalizedBrand.includes(word))) {
    return "This brand trends slim. Choose one size up if you prefer a relaxed fit.";
  }

  return "Fit risk is normal. Keep your usual size unless you are between sizes.";
}

function chooseRoute(input: {
  draft: ReturnDraft;
  grade: HealthCard["grade"];
  conditionScore: number;
  qualityScore: number;
  needMatch?: NeedMatch;
  severe: number;
}): ReturnRoute {
  if (input.needMatch && input.conditionScore > 74 && input.draft.category !== "ELECTRONICS") {
    return "PEER_EXCHANGE";
  }

  if (input.grade === "A" || (input.grade === "B" && input.conditionScore > 78)) {
    return "RESALE";
  }

  if (input.draft.category === "ELECTRONICS" && input.qualityScore > 48 && input.severe < 2) {
    return "REFURBISH";
  }

  if (input.grade === "C") {
    return "DONATE";
  }

  return "LIQUIDATE";
}

function findNeedMatch(draft: ReturnDraft): NeedMatch | undefined {
  const exact = needPools.find((pool) => pool.category === draft.category && pool.size && pool.size === draft.size.toUpperCase());
  const category = needPools.find((pool) => pool.category === draft.category && !pool.size);
  const match = exact ?? category;

  if (!match) {
    return undefined;
  }

  return {
    pool: match.pool,
    distanceKm: match.distanceKm,
    demand: match.demand,
    note: match.note
  };
}

function buildRiskFlags(input: {
  text: string;
  severe: number;
  fit: number;
  draft: ReturnDraft;
  imageSignal: number;
}) {
  const flags: string[] = [];

  if (input.severe > 0) {
    flags.push("Manual inspection required before resale.");
  }

  if (input.fit > 0) {
    flags.push(sizeRecommendation(input.draft.brand, input.draft.size, input.draft.category));
  }

  if (input.imageSignal < 10) {
    flags.push("Ask for at least two images to improve grading confidence.");
  }

  if (input.text.includes("missing")) {
    flags.push("Accessory completeness must be verified.");
  }

  return flags.length ? flags : ["No major quality risk detected in the submitted details."];
}

function scoreMatches(text: string, terms: string[]) {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
