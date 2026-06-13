"use client";

import { useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Leaf,
  MapPin,
  Package,
  Shield,
  Signal,
  Star,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Data ──────────────────────────────────────────────────────────────────────

type MatchItem = {
  id: string;
  title: string;
  brand: string;
  category: string;
  size: string;
  region: string;
  grade: string;
  conditionScore: number;
  greenCredits: number;
  status: "matched" | "available" | "fulfilled";
};

type DemandPool = {
  id: string;
  label: string;
  description: string;
  region: string;
  category: string;
  size: string | null;
  urgency: number;
  demandLevel: "High" | "Medium" | "Low";
  distanceKm: number;
  matchScore: number;
  matchedItemId: string | null;
};

const matchItems: MatchItem[] = [
  {
    id: "mi-001",
    title: "CloudWalk Canvas Sneakers",
    brand: "CloudWalk",
    category: "FOOTWEAR",
    size: "UK8",
    region: "North Bengaluru",
    grade: "A",
    conditionScore: 96,
    greenCredits: 45,
    status: "matched",
  },
  {
    id: "mi-002",
    title: "AeroStride Velocity Running Shoes",
    brand: "AeroStride",
    category: "FOOTWEAR",
    size: "UK7",
    region: "North Bengaluru",
    grade: "A",
    conditionScore: 92,
    greenCredits: 30,
    status: "available",
  },
  {
    id: "mi-003",
    title: "FlexBeam Study Lamp",
    brand: "FlexBeam",
    category: "HOME",
    size: "",
    region: "Indiranagar",
    grade: "C",
    conditionScore: 58,
    greenCredits: 40,
    status: "available",
  },
  {
    id: "mi-004",
    title: "StoryTime Picture Books Bundle",
    brand: "StoryTime",
    category: "BOOKS",
    size: "",
    region: "Whitefield",
    grade: "A",
    conditionScore: 95,
    greenCredits: 30,
    status: "fulfilled",
  },
];

const demandPools: DemandPool[] = [
  {
    id: "dp-001",
    label: "Student nearby needs running shoes",
    description: "Verified student program — gig-worker and student footwear needs in North Bengaluru.",
    region: "North Bengaluru",
    category: "FOOTWEAR",
    size: "UK8",
    urgency: 8,
    demandLevel: "High",
    distanceKm: 3.4,
    matchScore: 82,
    matchedItemId: "mi-001",
  },
  {
    id: "dp-002",
    label: "Community centre needs home essentials",
    description: "Verified community organization collecting functional home items for redistribution.",
    region: "Indiranagar",
    category: "HOME",
    size: null,
    urgency: 7,
    demandLevel: "Medium",
    distanceKm: 2.1,
    matchScore: 71,
    matchedItemId: null,
  },
  {
    id: "dp-003",
    label: "Library program needs children's books",
    description: "City library reuse program collecting books for reading corners in under-served schools.",
    region: "Whitefield",
    category: "BOOKS",
    size: null,
    urgency: 9,
    demandLevel: "High",
    distanceKm: 6.1,
    matchScore: 74,
    matchedItemId: "mi-004",
  },
  {
    id: "dp-004",
    label: "NGO needs apparel (size M)",
    description: "Verified NGO distributing clean clothing to migrant workers. Recurring monthly demand.",
    region: "Koramangala",
    category: "APPAREL",
    size: "M",
    urgency: 6,
    demandLevel: "Medium",
    distanceKm: 4.8,
    matchScore: 67,
    matchedItemId: null,
  },
  {
    id: "dp-005",
    label: "E-waste recovery partner",
    description: "Certified e-waste handler for responsible component recovery and recycling.",
    region: "HSR Layout",
    category: "ELECTRONICS",
    size: null,
    urgency: 4,
    demandLevel: "Low",
    distanceKm: 8.2,
    matchScore: 38,
    matchedItemId: null,
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const [selectedPool, setSelectedPool] = useState<DemandPool>(demandPools[0]);

  const activeMatches = matchItems.filter((i) => i.status === "matched");
  const fulfilled = matchItems.filter((i) => i.status === "fulfilled");
  const totalCarbon = matchItems.reduce((s, i) => s + (i.status !== "available" ? 4.5 : 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nearby Need Matching</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anonymous demand matching — no identity exchange, no customer chat. Amazon handles all logistics.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={Signal} label="Active Pools" value={String(demandPools.filter((p) => !p.matchedItemId).length)} />
        <MetricCard icon={ArrowRightLeft} label="Matched" value={String(activeMatches.length)} />
        <MetricCard icon={CheckCircle2} label="Fulfilled" value={String(fulfilled.length)} />
        <MetricCard icon={Leaf} label="CO₂ Saved" value={`${totalCarbon.toFixed(1)} kg`} />
        <MetricCard icon={Shield} label="Privacy" value="Anonymous" />
      </div>

      <Tabs defaultValue="pools">
        <TabsList>
          <TabsTrigger value="pools">Demand Pools</TabsTrigger>
          <TabsTrigger value="items">Item Queue</TabsTrigger>
          <TabsTrigger value="how">How It Works</TabsTrigger>
        </TabsList>

        {/* ─── Demand Pools ─────────────────────────────────────────────── */}
        <TabsContent value="pools" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            {/* Pool list */}
            <div className="space-y-3">
              {demandPools.map((pool) => (
                <button
                  key={pool.id}
                  onClick={() => setSelectedPool(pool)}
                  className={`w-full rounded-md border p-4 text-left transition-colors ${
                    selectedPool.id === pool.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                  } ${pool.id === "dp-001" ? "ring-2 ring-amber-300 ring-offset-1" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{pool.label}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {pool.region}
                        {pool.size && <span>· Size: {pool.size}</span>}
                        <span>· {pool.distanceKm} km</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={pool.demandLevel === "High" ? "default" : pool.demandLevel === "Medium" ? "secondary" : "outline"}>
                        {pool.demandLevel}
                      </Badge>
                      {pool.matchedItemId && (
                        <Badge variant="success" className="text-[9px]">Matched</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="mb-0.5 flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Match Score</span>
                      <span className="font-medium">{pool.matchScore}/100</span>
                    </div>
                    <Progress value={pool.matchScore} />
                  </div>
                  {pool.id === "dp-001" && (
                    <div className="mt-2 flex items-center gap-1 rounded bg-amber-50 px-2 py-1">
                      <Star className="h-3 w-3 text-amber-600" />
                      <span className="text-[10px] font-medium text-amber-700">Demo: Shoes matched to student nearby</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Pool detail */}
            <div className="space-y-4">
              {selectedPool.id === "dp-001" && (
                <div className="rounded-lg border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-transparent p-4">
                  <div className="flex items-start gap-3">
                    <Star className="mt-0.5 h-5 w-5 flex-none text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-900">Live Match: Student needs running shoes</p>
                      <p className="mt-1 text-sm text-amber-800">
                        CloudWalk Sneakers (UK8, Grade A) matched to anonymous demand 3.4 km away.
                        Score 82/100. Amazon pickup scheduled — zero identity exposure.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{selectedPool.label}</CardTitle>
                  <CardDescription>{selectedPool.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <InfoBox label="Category" value={selectedPool.category} />
                    <InfoBox label="Size" value={selectedPool.size || "Any"} />
                    <InfoBox label="Urgency" value={`${selectedPool.urgency}/10`} />
                    <InfoBox label="Distance" value={`${selectedPool.distanceKm} km`} />
                  </div>

                  {/* Scoring breakdown */}
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-xs font-medium">Composite Score Breakdown</p>
                    <ScoreRow label="Distance (30%)" value={Math.max(0, 100 - selectedPool.distanceKm * 10)} />
                    <ScoreRow label="Urgency (25%)" value={selectedPool.urgency * 10} />
                    <ScoreRow label="Size Match (25%)" value={selectedPool.size ? 100 : 60} />
                    <ScoreRow label="Demand Level (20%)" value={selectedPool.demandLevel === "High" ? 85 : selectedPool.demandLevel === "Medium" ? 60 : 35} />
                    <div className="mt-2 flex items-center justify-between border-t pt-2">
                      <span className="text-xs font-semibold">Composite</span>
                      <span className="text-sm font-bold text-primary">{selectedPool.matchScore}/100</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Threshold: 55 · {selectedPool.matchScore > 55 ? "✓ Recommends PEER_EXCHANGE" : "✗ Below threshold"}
                    </p>
                  </div>

                  {/* Matched item */}
                  {selectedPool.matchedItemId && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Matched Item</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {matchItems.find((i) => i.id === selectedPool.matchedItemId)?.title} — Grade {matchItems.find((i) => i.id === selectedPool.matchedItemId)?.grade}
                      </p>
                    </div>
                  )}

                  {/* Logistics */}
                  <div className="flex items-start gap-3 rounded-md bg-muted p-3">
                    <Truck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">Pickup & Delivery</p>
                      <p className="text-[10px] text-muted-foreground">
                        Amazon-managed reverse logistics. Seller drops at nearest hub or schedules free pickup. Recipient collects from local hub.
                      </p>
                    </div>
                  </div>

                  {/* Privacy */}
                  <div className="flex items-start gap-3 rounded-md bg-muted p-3">
                    <Shield className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-medium">Zero Identity Exposure</p>
                      <p className="text-[10px] text-muted-foreground">
                        Matching is pool-level only. No names, addresses, or contact details shared.
                        Location: city-level granularity only.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── Item Queue ───────────────────────────────────────────────── */}
        <TabsContent value="items" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matchItems.map((item) => (
              <Card key={item.id} className={item.status === "matched" ? "border-primary/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.category} · {item.size || "N/A"} · {item.region}</p>
                    </div>
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                      {item.grade}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded bg-muted p-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground">Score</p>
                      <p className="text-xs font-semibold">{item.conditionScore}</p>
                    </div>
                    <div className="rounded bg-muted p-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground">Credits</p>
                      <p className="text-xs font-semibold">+{item.greenCredits}</p>
                    </div>
                    <div className="rounded bg-muted p-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground">Status</p>
                      <p className="text-xs font-semibold capitalize">{item.status}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge
                      variant={item.status === "matched" ? "default" : item.status === "fulfilled" ? "success" : "outline"}
                      className="w-full justify-center text-xs"
                    >
                      {item.status === "matched" ? "🤝 Matched — pickup scheduled" :
                       item.status === "fulfilled" ? "✓ Delivered to recipient" :
                       "⏳ Waiting for demand match"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── How It Works ─────────────────────────────────────────────── */}
        <TabsContent value="how" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Matching Algorithm</CardTitle>
                <CardDescription>Weighted composite scoring for anonymous demand</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { factor: "Distance", weight: "30%", formula: "max(0, 100 − km × 10)", desc: "Closer = higher score. 0 at 10+ km." },
                  { factor: "Urgency", weight: "25%", formula: "urgency × 10", desc: "NeedSignal urgency 1–10 normalized to 0–100." },
                  { factor: "Size Match", weight: "25%", formula: "Exact=100, None=60, Mismatch=20", desc: "Exact match gets full score." },
                  { factor: "Demand Level", weight: "20%", formula: "High=85, Medium=60, Low=35", desc: "Pool activity indicator." },
                ].map((f) => (
                  <div key={f.factor} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{f.factor}</span>
                      <Badge variant="outline">{f.weight}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
                    <code className="mt-1 block text-[10px] text-primary">{f.formula}</code>
                  </div>
                ))}
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-medium">Recommendation Threshold: <span className="text-primary">55</span></p>
                  <p className="text-[10px] text-muted-foreground">
                    PEER_EXCHANGE is recommended when composite score &gt; 55 AND condition score &gt; 74.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Privacy & Logistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { icon: Shield, title: "Anonymous pools", desc: "No individual identity exposed. Matching at pool level only." },
                  { icon: MapPin, title: "City-level location", desc: "Never address or neighborhood precision. Region-only granularity." },
                  { icon: Truck, title: "Amazon-managed pickup", desc: "Free reverse logistics. Drop at hub or schedule home pickup." },
                  { icon: Users, title: "No customer chat", desc: "Zero direct contact between parties. Amazon handles all coordination." },
                  { icon: Leaf, title: "4.5 kg CO₂ per exchange", desc: "Highest sustainability impact of all routes." },
                  { icon: Zap, title: "45 green credits", desc: "Maximum credit award for peer exchange completion." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <item.icon className="mt-0.5 h-4 w-4 flex-none text-primary" />
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value }: { icon: typeof Signal; label: string; value: string }) {
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-semibold">{value}</p>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
