"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Camera,
  CheckCircle2,
  DollarSign,
  Eye,
  Filter,
  Leaf,
  Package,
  Recycle,
  Scan,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// ─── Operator-level inspection queue data ──────────────────────────────────────

type InspectionItem = {
  id: string;
  title: string;
  brand: string;
  category: string;
  size: string;
  region: string;
  reason: string;
  grade: "A" | "B" | "C" | "D";
  route: string;
  conditionScore: number;
  qualityScore: number;
  historyScore: number;
  confidence: number;
  damageScore: number;
  cleanlinessScore: number;
  greenCredits: number;
  carbonSaved: number;
  expectedRecovery: string;
  originalPrice: number;
  estimatedPrice: number | null;
  imageCount: number;
  severeTerms: string[];
  mildTerms: string[];
  unusedTerms: string[];
  visionClear: boolean;
  yoloDefects: number;
  reasoning: string;
  nearbyDemand: { pool: string; distance: number; demand: string; score: number } | null;
  highlight?: string;
};

const queueItems: InspectionItem[] = [
  {
    id: "INS-001",
    title: "CloudWalk Canvas Sneakers",
    brand: "CloudWalk",
    category: "FOOTWEAR",
    size: "UK8",
    region: "North Bengaluru",
    reason: "Duplicate order, unused",
    grade: "A",
    route: "PEER_EXCHANGE",
    conditionScore: 96,
    qualityScore: 90,
    historyScore: 88,
    confidence: 91,
    damageScore: 100,
    cleanlinessScore: 95,
    greenCredits: 45,
    carbonSaved: 4.5,
    expectedRecovery: "₹2,124 (85% via peer exchange)",
    originalPrice: 2499,
    estimatedPrice: 2124,
    imageCount: 3,
    severeTerms: [],
    mildTerms: [],
    unusedTerms: ["unused", "duplicate", "new"],
    visionClear: true,
    yoloDefects: 0,
    reasoning: "Brand new, sealed item. Duplicate order confirmed. Nearby footwear demand pool in North Bengaluru has high urgency (8/10) with exact size match (UK8). PEER_EXCHANGE beats RESALE here — faster turnover, higher credits, lower logistics cost.",
    nearbyDemand: { pool: "North Bengaluru footwear pool", distance: 3.4, demand: "High", score: 82 },
    highlight: "demo-case",
  },
  {
    id: "INS-002",
    title: "AeroStride Velocity Running Shoes",
    brand: "AeroStride",
    category: "FOOTWEAR",
    size: "UK7",
    region: "North Bengaluru",
    reason: "Size is too tight",
    grade: "A",
    route: "RESALE",
    conditionScore: 92,
    qualityScore: 88,
    historyScore: 85,
    confidence: 88,
    damageScore: 95,
    cleanlinessScore: 92,
    greenCredits: 30,
    carbonSaved: 4.2,
    expectedRecovery: "₹3,499 (70% via resale)",
    originalPrice: 4999,
    estimatedPrice: 3499,
    imageCount: 2,
    severeTerms: [],
    mildTerms: [],
    unusedTerms: ["unused"],
    visionClear: true,
    yoloDefects: 0,
    reasoning: "Excellent condition, unused. Size-related return only. No nearby demand match for UK7 exceeds threshold — marketplace resale is optimal. Expected 70% recovery.",
    nearbyDemand: null,
  },
  {
    id: "INS-003",
    title: "KitchenPro Mixer Grinder 750W",
    brand: "KitchenPro",
    category: "ELECTRONICS",
    size: "",
    region: "Koramangala",
    reason: "Jar capacity smaller than expected",
    grade: "B",
    route: "REFURBISH",
    conditionScore: 74,
    qualityScore: 68,
    historyScore: 72,
    confidence: 71,
    damageScore: 78,
    cleanlinessScore: 70,
    greenCredits: 30,
    carbonSaved: 3.1,
    expectedRecovery: "₹1,320 (40% after refurb cost)",
    originalPrice: 3299,
    estimatedPrice: 1320,
    imageCount: 1,
    severeTerms: [],
    mildTerms: ["opened", "box"],
    unusedTerms: [],
    visionClear: false,
    yoloDefects: 0,
    reasoning: "Functional electronics with opened packaging. Image clarity below threshold — single image provided. Quality score meets refurbishment threshold (>48) for electronics category.",
    nearbyDemand: null,
  },
  {
    id: "INS-004",
    title: "FlexBeam Study Lamp",
    brand: "FlexBeam",
    category: "HOME",
    size: "",
    region: "Indiranagar",
    reason: "Not bright enough for room",
    grade: "C",
    route: "DONATE",
    conditionScore: 58,
    qualityScore: 54,
    historyScore: 55,
    confidence: 56,
    damageScore: 72,
    cleanlinessScore: 58,
    greenCredits: 40,
    carbonSaved: 3.8,
    expectedRecovery: "No monetary — 3.8 kg CO₂ offset",
    originalPrice: 1299,
    estimatedPrice: null,
    imageCount: 3,
    severeTerms: [],
    mildTerms: ["minor", "scratch"],
    unusedTerms: [],
    visionClear: false,
    yoloDefects: 1,
    reasoning: "Functional but cosmetic damage and expectation mismatch. Grade C — below resale threshold. Community home essentials pool nearby (2.1km) but condition score 58 doesn't meet >74 requirement for PEER_EXCHANGE. Donation maximizes social value.",
    nearbyDemand: { pool: "Community home essentials", distance: 2.1, demand: "Medium", score: 71 },
  },
  {
    id: "INS-005",
    title: "TechGear Wireless Earbuds Pro",
    brand: "TechGear",
    category: "ELECTRONICS",
    size: "",
    region: "HSR Layout",
    reason: "Left earbud dead on arrival",
    grade: "D",
    route: "LIQUIDATE",
    conditionScore: 28,
    qualityScore: 42,
    historyScore: 35,
    confidence: 35,
    damageScore: 25,
    cleanlinessScore: 40,
    greenCredits: 10,
    carbonSaved: 1.2,
    expectedRecovery: "₹600 (10% bulk liquidation)",
    originalPrice: 5999,
    estimatedPrice: 600,
    imageCount: 1,
    severeTerms: ["dead"],
    mildTerms: [],
    unusedTerms: [],
    visionClear: false,
    yoloDefects: 2,
    reasoning: "Hardware defect confirmed — left channel non-functional. 2 YOLO defects detected (housing scratch, discoloration near charging port). Grade D with electronics refurbish threshold not met (quality 42 < 48). Liquidation for parts recovery.",
    nearbyDemand: null,
  },
  {
    id: "INS-006",
    title: "StoryTime Picture Books Bundle",
    brand: "StoryTime",
    category: "BOOKS",
    size: "",
    region: "Whitefield",
    reason: "Gift duplicate, already have set",
    grade: "A",
    route: "RESALE",
    conditionScore: 95,
    qualityScore: 92,
    historyScore: 90,
    confidence: 92,
    damageScore: 100,
    cleanlinessScore: 96,
    greenCredits: 30,
    carbonSaved: 4.2,
    expectedRecovery: "₹1,119 (70% via resale)",
    originalPrice: 1599,
    estimatedPrice: 1119,
    imageCount: 2,
    severeTerms: [],
    mildTerms: [],
    unusedTerms: ["gift", "duplicate"],
    visionClear: true,
    yoloDefects: 0,
    reasoning: "Gift duplicate — completely new condition. No nearby book demand pool exceeds threshold in Whitefield region. Direct resale is optimal with 92% confidence.",
    nearbyDemand: { pool: "City library reuse pool", distance: 6.1, demand: "High", score: 74 },
  },
];

// ─── Page Component ────────────────────────────────────────────────────────────

export default function InspectPage() {
  const [selectedItem, setSelectedItem] = useState<InspectionItem>(queueItems[0]);
  const [filterRoute, setFilterRoute] = useState<string>("ALL");
  const [filterGrade, setFilterGrade] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const filteredItems = useMemo(() => {
    return queueItems.filter((item) => {
      if (filterRoute !== "ALL" && item.route !== filterRoute) return false;
      if (filterGrade !== "ALL" && item.grade !== filterGrade) return false;
      if (filterCategory !== "ALL" && item.category !== filterCategory) return false;
      return true;
    });
  }, [filterRoute, filterGrade, filterCategory]);

  const totalCarbon = queueItems.reduce((sum, i) => sum + i.carbonSaved, 0);
  const avgConfidence = Math.round(queueItems.reduce((sum, i) => sum + i.confidence, 0) / queueItems.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Inspection Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Operator view — inspect queue, grading results, routing logic, and recovery value.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{queueItems.length} in queue</Badge>
          <Badge variant="success">All services online</Badge>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={Package} label="Queue Items" value={String(queueItems.length)} />
        <MetricCard icon={TrendingUp} label="Avg Confidence" value={`${avgConfidence}%`} />
        <MetricCard icon={Leaf} label="Total CO₂ Saved" value={`${totalCarbon.toFixed(1)} kg`} />
        <MetricCard icon={DollarSign} label="Recovery Pipeline" value="₹8,662" />
        <MetricCard icon={ArrowRightLeft} label="Peer Matches" value="1 active" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filters:
          </div>
          <FilterSelect
            value={filterRoute}
            onChange={setFilterRoute}
            options={["ALL", "PEER_EXCHANGE", "RESALE", "REFURBISH", "DONATE", "LIQUIDATE"]}
            label="Route"
          />
          <FilterSelect
            value={filterGrade}
            onChange={setFilterGrade}
            options={["ALL", "A", "B", "C", "D"]}
            label="Grade"
          />
          <FilterSelect
            value={filterCategory}
            onChange={setFilterCategory}
            options={["ALL", "FOOTWEAR", "ELECTRONICS", "HOME", "BOOKS", "APPAREL"]}
            label="Category"
          />
          {(filterRoute !== "ALL" || filterGrade !== "ALL" || filterCategory !== "ALL") && (
            <button
              onClick={() => { setFilterRoute("ALL"); setFilterGrade("ALL"); setFilterCategory("ALL"); }}
              className="text-xs text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Queue list */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Inspection Queue ({filteredItems.length})
          </p>
          <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full rounded-md border p-3 text-left transition-colors ${
                  selectedItem.id === item.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                } ${item.highlight === "demo-case" ? "ring-2 ring-amber-300 ring-offset-1" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.category} · {item.region}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                      {item.grade}
                    </span>
                    <RouteBadge route={item.route} />
                  </div>
                </div>
                {item.highlight === "demo-case" && (
                  <div className="mt-2 flex items-center gap-1 rounded bg-amber-50 px-2 py-1">
                    <Star className="h-3 w-3 text-amber-600" />
                    <span className="text-[10px] font-medium text-amber-700">
                      Demo: Avoids liquidation via nearby demand
                    </span>
                  </div>
                )}
              </button>
            ))}
            {filteredItems.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No items match filters</p>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {/* Demo callout for the highlighted item */}
          {selectedItem.highlight === "demo-case" && (
            <div className="rounded-lg border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-transparent p-4">
              <div className="flex items-start gap-3">
                <Star className="mt-0.5 h-5 w-5 flex-none text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">
                    ReLoop Demo Case: Low-value shoes avoid liquidation
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    These ₹2,499 sneakers would typically be liquidated for ₹375 (15%). Instead, ReLoop detected
                    anonymous nearby demand (3.4 km, urgency 8/10, exact size match) and routes them via
                    PEER_EXCHANGE — recovering ₹2,124 (85%) with +45 green credits and 4.5 kg CO₂ saved.
                    No customer-to-customer contact. Amazon handles pickup and delivery.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Health Card Preview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="h-4 w-4 text-primary" />
                      Health Card
                    </CardTitle>
                    <CardDescription className="mt-0.5">{selectedItem.title}</CardDescription>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                    {selectedItem.grade}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <ScoreMini label="Condition" value={selectedItem.conditionScore} />
                  <ScoreMini label="Quality" value={selectedItem.qualityScore} />
                  <ScoreMini label="Damage" value={selectedItem.damageScore} />
                  <ScoreMini label="Cleanliness" value={selectedItem.cleanlinessScore} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-semibold">{selectedItem.confidence}%</span>
                  </div>
                  <Progress value={selectedItem.confidence} />
                </div>
              </CardContent>
            </Card>

            {/* Routing + Recovery */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Route & Recovery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RouteIcon route={selectedItem.route} />
                      <span className="font-semibold">{selectedItem.route.replace("_", " ")}</span>
                    </div>
                    <Badge>{selectedItem.grade}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border p-2.5">
                    <p className="text-[10px] text-muted-foreground">Expected Recovery</p>
                    <p className="mt-0.5 text-sm font-semibold">{selectedItem.expectedRecovery}</p>
                  </div>
                  <div className="rounded-md border p-2.5">
                    <p className="text-[10px] text-muted-foreground">Original Price</p>
                    <p className="mt-0.5 text-sm font-semibold">₹{selectedItem.originalPrice.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md bg-green-50 p-2.5">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-green-700" />
                    <span className="text-sm font-medium text-green-800">+{selectedItem.greenCredits} credits</span>
                  </div>
                  <span className="text-xs text-green-700">{selectedItem.carbonSaved} kg CO₂</span>
                </div>
              </CardContent>
            </Card>

            {/* Vision Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="h-4 w-4 text-primary" />
                  Vision Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <VisionMetric
                    label="Blur"
                    value={selectedItem.visionClear ? 142 : 55}
                    pass={selectedItem.visionClear}
                  />
                  <VisionMetric
                    label="Brightness"
                    value={selectedItem.visionClear ? 132 : 42}
                    pass={selectedItem.visionClear}
                  />
                  <VisionMetric
                    label="Edges"
                    value={selectedItem.visionClear ? 0.34 : 0.11}
                    pass={selectedItem.visionClear}
                  />
                </div>

                <div className="flex items-center gap-2 rounded-md bg-muted p-2.5">
                  {selectedItem.visionClear ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="text-xs">
                    {selectedItem.visionClear ? "Clear — +8 quality bonus" : "Below threshold — no clarity bonus"}
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-md border p-2.5">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    YOLO: {selectedItem.yoloDefects === 0
                      ? "No defects detected"
                      : `${selectedItem.yoloDefects} defect(s) detected`}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">
                  {selectedItem.imageCount} image(s) analyzed
                </div>
              </CardContent>
            </Card>

            {/* Text Signals + Nearby Demand */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Signals & Demand
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <TermChip label="Severe" terms={selectedItem.severeTerms} variant="destructive" />
                  <TermChip label="Mild" terms={selectedItem.mildTerms} variant="warning" />
                  <TermChip label="Unused" terms={selectedItem.unusedTerms} variant="success" />
                </div>

                {selectedItem.nearbyDemand ? (
                  <div className={`rounded-md border p-3 ${
                    selectedItem.route === "PEER_EXCHANGE" ? "border-primary/30 bg-primary/5" : ""
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">Nearby Demand</span>
                      {selectedItem.route === "PEER_EXCHANGE" && (
                        <Badge variant="default" className="ml-auto text-[10px]">MATCHED</Badge>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                      <span className="text-muted-foreground">Pool: {selectedItem.nearbyDemand.pool}</span>
                      <span className="text-muted-foreground">{selectedItem.nearbyDemand.distance} km</span>
                      <span className="text-muted-foreground">Demand: {selectedItem.nearbyDemand.demand}</span>
                      <span className="text-muted-foreground">Score: {selectedItem.nearbyDemand.score}/100</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border p-3">
                    <span className="text-xs text-muted-foreground">No nearby demand pool matched</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Reasoning */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                AI Reasoning
              </CardTitle>
              <CardDescription>
                {selectedItem.id} · {selectedItem.reason}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{selectedItem.reasoning}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">
                  <Scan className="mr-1 h-3 w-3" />
                  opencv
                </Badge>
                <Badge variant="outline">
                  <Sparkles className="mr-1 h-3 w-3" />
                  ollama
                </Badge>
                {selectedItem.yoloDefects > 0 && (
                  <Badge variant="outline">
                    <Eye className="mr-1 h-3 w-3" />
                    yolo
                  </Badge>
                )}
                <Badge variant="outline">
                  <Activity className="mr-1 h-3 w-3" />
                  routing-engine
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Routing priority table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Routing Priority Evaluation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {[
                  { route: "PEER_EXCHANGE", priority: 1, rule: "NeedSignal match + ConditionScore > 74 + non-Electronics" },
                  { route: "RESALE", priority: 2, rule: "Grade A, or Grade B with ConditionScore > 78" },
                  { route: "REFURBISH", priority: 3, rule: "Electronics + QualityScore > 48 + severe defects < 2" },
                  { route: "DONATE", priority: 4, rule: "Grade C, no higher-priority route satisfied" },
                  { route: "LIQUIDATE", priority: 5, rule: "Grade D or fallback — no other route matched" },
                ].map((r) => (
                  <div
                    key={r.route}
                    className={`flex items-center gap-3 rounded-md border p-2.5 ${
                      selectedItem.route === r.route ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                      {r.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium">{r.route.replace("_", " ")}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">{r.rule}</span>
                    </div>
                    {selectedItem.route === r.route && (
                      <CheckCircle2 className="h-4 w-4 flex-none text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-xs"
      aria-label={label}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt === "ALL" ? `All ${label}s` : opt.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}

function RouteBadge({ route }: { route: string }) {
  const variants: Record<string, "default" | "success" | "secondary" | "warning" | "destructive" | "outline"> = {
    PEER_EXCHANGE: "default",
    RESALE: "success",
    REFURBISH: "secondary",
    DONATE: "warning",
    LIQUIDATE: "destructive",
  };
  return (
    <Badge variant={variants[route] || "outline"} className="text-[9px] px-1.5 py-0">
      {route.replace("_", " ").slice(0, 8)}
    </Badge>
  );
}

function RouteIcon({ route }: { route: string }) {
  switch (route) {
    case "PEER_EXCHANGE": return <ArrowRightLeft className="h-4 w-4 text-primary" />;
    case "RESALE": return <Package className="h-4 w-4 text-primary" />;
    case "DONATE": return <Leaf className="h-4 w-4 text-primary" />;
    case "REFURBISH": return <Sparkles className="h-4 w-4 text-primary" />;
    default: return <Recycle className="h-4 w-4 text-primary" />;
  }
}

function ScoreMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}

function VisionMetric({ label, value, pass }: { label: string; value: number; pass: boolean }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
      <p className={`text-[10px] ${pass ? "text-green-600" : "text-amber-600"}`}>
        {pass ? "✓" : "✗"}
      </p>
    </div>
  );
}

function TermChip({ label, terms, variant }: { label: string; terms: string[]; variant: "destructive" | "warning" | "success" }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap gap-0.5">
        {terms.length > 0 ? (
          terms.map((t) => (
            <Badge key={t} variant={variant} className="text-[9px] px-1 py-0">{t}</Badge>
          ))
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}
