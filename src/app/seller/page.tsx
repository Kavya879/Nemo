"use client";

import { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Lightbulb,
  PenLine,
  Ruler,
  Shirt,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Seller dashboard data ─────────────────────────────────────────────────────

type SellerProduct = {
  id: string;
  title: string;
  brand: string;
  category: string;
  totalSold: number;
  returnCount: number;
  returnRate: number;
  listingQuality: number;
  topReasons: { reason: string; count: number; pct: number }[];
  original: {
    title: string;
    bullets: string[];
    description: string;
    sizeNote: string;
  };
  rewrite: {
    title: string;
    bullets: string[];
    description: string;
    sizeNote: string;
    detectedIssue: string;
    preventionTip: string;
  };
  demoPrimary?: boolean;
};

const sellerProducts: SellerProduct[] = [
  {
    id: "sp-001",
    title: "AeroStride Velocity Running Shoes",
    brand: "AeroStride",
    category: "FOOTWEAR",
    totalSold: 412,
    returnCount: 28,
    returnRate: 6.8,
    listingQuality: 42,
    topReasons: [
      { reason: "Size not as expected", count: 19, pct: 68 },
      { reason: "Too tight / narrow", count: 5, pct: 18 },
      { reason: "Wrong size ordered", count: 3, pct: 11 },
      { reason: "Other", count: 1, pct: 3 },
    ],
    original: {
      title: "AeroStride Velocity Running Shoes",
      bullets: [
        "Lightweight running shoes for daily training",
        "Breathable mesh upper for ventilation",
        "Available in UK sizes 6–11",
        "EVA foam midsole for cushioning",
      ],
      description: "High-performance running shoes designed for speed and comfort. Perfect for daily runners who want a responsive ride. The mesh upper keeps feet cool during long runs.",
      sizeNote: "",
    },
    rewrite: {
      title: "AeroStride Velocity Running Shoes — Narrow Fit, Size Up 1 for Relaxed Feel",
      bullets: [
        "⚠️ RUNS SMALL: If you usually wear UK7, choose UK8 for this brand",
        "Narrow performance fit — not for wide feet (see wide-fit variant)",
        "Breathable mesh upper with reinforced heel counter",
        "EVA foam midsole — responsive cushioning for daily training",
        "See size comparison chart below before ordering",
      ],
      description: "High-performance running shoes with a narrow, race-day fit. These shoes run approximately one size small — if you normally wear UK7, we strongly recommend ordering UK8. Wide-foot runners should choose our wide-fit variant or size up by 1.5. The breathable mesh upper and responsive EVA midsole make these ideal for daily training at pace.",
      sizeNote: "If you usually wear UK7, choose UK8 for this brand. This shoe has a narrow performance fit designed for speed, not casual walking. Wide feet? Choose the wide-fit variant.",
      detectedIssue: "68% of returns cite size mismatch — the listing doesn't warn buyers that this brand runs small and narrow",
      preventionTip: "Add a prominent size warning at the top of the listing. Include a brand-specific size comparison chart. Mention the narrow fit type in the title.",
    },
    demoPrimary: true,
  },
  {
    id: "sp-002",
    title: "TrailMaster Hiking Boots",
    brand: "TrailMaster",
    category: "FOOTWEAR",
    totalSold: 189,
    returnCount: 15,
    returnRate: 7.9,
    listingQuality: 51,
    topReasons: [
      { reason: "Too narrow for thick socks", count: 8, pct: 53 },
      { reason: "Heel slips", count: 4, pct: 27 },
      { reason: "Smaller than expected", count: 3, pct: 20 },
    ],
    original: {
      title: "TrailMaster Hiking Boots",
      bullets: [
        "Durable hiking boots for outdoor adventures",
        "Waterproof membrane keeps feet dry",
        "Vibram outsole for grip on rough terrain",
        "Available in sizes UK6–12",
      ],
      description: "Take on any trail with confidence. These waterproof hiking boots feature a rugged Vibram outsole and breathable waterproof membrane.",
      sizeNote: "",
    },
    rewrite: {
      title: "TrailMaster Hiking Boots — Performance Fit, Size Up ½ for Thick Socks",
      bullets: [
        "⚠️ SIZE UP: Order half a size larger if wearing thick hiking socks",
        "Snug performance fit in toe box — not suitable for wide feet",
        "Waterproof membrane + Vibram outsole for all-terrain grip",
        "Reinforced heel counter — minimal heel slip when properly sized",
        "Break-in period: 2–3 hikes for optimal comfort",
      ],
      description: "Waterproof hiking boots with a performance-oriented snug fit. IMPORTANT: These boots are designed to be worn with thin liner socks. If you plan to wear thick hiking socks, order half a size up. The toe box is narrower than casual boots — wide-foot hikers should consider the wide-fit version. Vibram outsole provides excellent grip on wet rock and loose trail.",
      sizeNote: "Size up ½ for thick socks. Snug toe box — not for wide feet without the wide-fit variant. Break-in period is 2–3 hikes.",
      detectedIssue: "53% of returns mention sock thickness compatibility — listing doesn't address boot fit with different sock weights",
      preventionTip: "State clearly: 'Size up half a size for thick socks.' Add a sock-thickness sizing guide.",
    },
  },
  {
    id: "sp-003",
    title: "KitchenPro Mixer Grinder 750W",
    brand: "KitchenPro",
    category: "ELECTRONICS",
    totalSold: 267,
    returnCount: 17,
    returnRate: 6.4,
    listingQuality: 58,
    topReasons: [
      { reason: "Jar smaller than expected", count: 9, pct: 53 },
      { reason: "Plug type confusion", count: 5, pct: 29 },
      { reason: "Too tall for cabinet", count: 3, pct: 18 },
    ],
    original: {
      title: "KitchenPro Mixer Grinder 750W",
      bullets: [
        "Powerful 750W motor for all grinding needs",
        "Comes with multiple jars",
        "Stainless steel blades",
        "1-year warranty",
      ],
      description: "The KitchenPro 750W mixer grinder handles everything from wet grinding to dry spices. Powerful motor with overload protection.",
      sizeNote: "",
    },
    rewrite: {
      title: "KitchenPro 750W Mixer Grinder — 1.5L Jar, India 3-Pin Plug, 21cm Height",
      bullets: [
        "Includes: 1.5L blending jar, 1L dry jar, 0.4L chutney jar (sizes printed on jars)",
        "India 3-pin plug included — no adapter needed for Indian outlets",
        "Motor base height: 21cm — fits under standard 25cm kitchen cabinets",
        "750W copper-wound motor with thermal overload protection",
        "Stainless steel blades — dishwasher safe jars",
      ],
      description: "The KitchenPro 750W mixer grinder comes with three jars clearly marked with capacity: 1.5L for smoothies and batters, 1L for dry grinding, and 0.4L for chutneys. The motor base is 21cm tall and fits under most standard kitchen cabinets (25cm clearance needed). Ships with India 3-pin plug — no adapter required.",
      sizeNote: "Motor base: 21cm tall. Jars: 1.5L / 1L / 0.4L. Plug: India 3-pin standard.",
      detectedIssue: "53% of returns cite jar capacity confusion — listing says 'multiple jars' without specifying sizes",
      preventionTip: "Show jar scale markings in photos. State exact capacities and plug type in the title.",
    },
  },
];

// ─── Page Component ────────────────────────────────────────────────────────────

export default function SellerPage() {
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct>(sellerProducts[0]);
  const [rewriteApplied, setRewriteApplied] = useState<Record<string, boolean>>({});

  const totalReturns = sellerProducts.reduce((s, p) => s + p.returnCount, 0);
  const avgRate = (sellerProducts.reduce((s, p) => s + p.returnRate, 0) / sellerProducts.length).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seller Return Intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered return pattern detection, listing rewrites, and prevention recommendations.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={BarChart3} label="Total Returns" value={String(totalReturns)} />
        <MetricCard icon={TrendingDown} label="Avg Return Rate" value={`${avgRate}%`} />
        <MetricCard icon={PenLine} label="Rewrites Ready" value={String(sellerProducts.length)} />
        <MetricCard icon={Shirt} label="Size Warnings" value="2 products" />
        <MetricCard icon={TrendingUp} label="Est. Prevention" value="34 returns/mo" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Product list sidebar */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Products with Returns ({sellerProducts.length})
          </p>
          {sellerProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className={`w-full rounded-md border p-3 text-left transition-colors ${
                selectedProduct.id === product.id ? "border-primary bg-primary/5" : "hover:bg-muted"
              } ${product.demoPrimary ? "ring-2 ring-amber-300 ring-offset-1" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.title}</p>
                  <p className="text-xs text-muted-foreground">{product.category} · {product.brand}</p>
                </div>
                <Badge variant={product.returnRate > 7 ? "destructive" : product.returnRate > 5 ? "warning" : "secondary"} className="text-[10px]">
                  {product.returnRate}%
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{product.returnCount} returns / {product.totalSold} sold</span>
                <QualityDot score={product.listingQuality} />
              </div>
              {product.demoPrimary && (
                <div className="mt-2 flex items-center gap-1 rounded bg-amber-50 px-2 py-1">
                  <Star className="h-3 w-3 text-amber-600" />
                  <span className="text-[10px] font-medium text-amber-700">Demo: Size mismatch pattern</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {/* Demo callout */}
          {selectedProduct.demoPrimary && (
            <div className="rounded-lg border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-transparent p-4">
              <div className="flex items-start gap-3">
                <Star className="mt-0.5 h-5 w-5 flex-none text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">
                    Demo Case: Size mismatch is the #1 return driver
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    68% of returns for this shoe cite &quot;size not as expected.&quot; The original listing has no
                    size warning. AI detects the pattern and generates: <em>&quot;If you usually wear UK7,
                    choose UK8 for this brand.&quot;</em> — projected to prevent ~19 returns/month.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Return analysis + Listing quality */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Return Reasons
                </CardTitle>
                <CardDescription>{selectedProduct.returnCount} returns from {selectedProduct.totalSold} units sold</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedProduct.topReasons.map((r) => (
                  <div key={r.reason}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">{r.reason}</span>
                      <span className="font-medium">{r.count} ({r.pct}%)</span>
                    </div>
                    <Progress value={r.pct} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Listing Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="35" fill="none"
                        stroke={selectedProduct.listingQuality > 70 ? "#16a34a" : selectedProduct.listingQuality > 50 ? "#f59e0b" : "#dc2626"}
                        strokeWidth="6"
                        strokeDasharray={`${selectedProduct.listingQuality * 2.2} 999`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                      {selectedProduct.listingQuality}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <QualityRow label="Size guidance" pass={selectedProduct.listingQuality > 70} />
                    <QualityRow label="Dimension specs" pass={selectedProduct.listingQuality > 60} />
                    <QualityRow label="Fit type mentioned" pass={false} />
                    <QualityRow label="Photo accuracy" pass={selectedProduct.listingQuality > 50} />
                    <QualityRow label="Return prevention" pass={false} />
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-medium text-destructive">
                    {selectedProduct.rewrite.detectedIssue}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Rewrite — Before/After */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Edit3 className="h-4 w-4 text-primary" />
                    AI Listing Rewrite
                  </CardTitle>
                  <CardDescription>{selectedProduct.rewrite.preventionTip}</CardDescription>
                </div>
                {!rewriteApplied[selectedProduct.id] ? (
                  <Button size="sm" onClick={() => setRewriteApplied({ ...rewriteApplied, [selectedProduct.id]: true })}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Apply Rewrite
                  </Button>
                ) : (
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Applied
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="comparison">
                <TabsList>
                  <TabsTrigger value="comparison">Before / After</TabsTrigger>
                  <TabsTrigger value="title">Title</TabsTrigger>
                  <TabsTrigger value="bullets">Bullets</TabsTrigger>
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="size">Size Note</TabsTrigger>
                </TabsList>

                <TabsContent value="comparison" className="mt-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Before */}
                    <div className="rounded-md border border-red-200 bg-red-50/30 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-xs font-semibold text-red-700 uppercase">Before</span>
                        <Badge variant="destructive" className="ml-auto text-[10px]">{selectedProduct.returnRate}% returns</Badge>
                      </div>
                      <p className="text-sm font-semibold">{selectedProduct.original.title}</p>
                      <ul className="mt-2 space-y-1">
                        {selectedProduct.original.bullets.map((b, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {b}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                        {selectedProduct.original.description}
                      </p>
                      {selectedProduct.original.sizeNote ? (
                        <div className="mt-2 rounded bg-muted p-2">
                          <p className="text-[10px] font-medium">Size Note:</p>
                          <p className="text-[10px] text-muted-foreground">{selectedProduct.original.sizeNote}</p>
                        </div>
                      ) : (
                        <div className="mt-2 rounded bg-red-100 p-2">
                          <p className="text-[10px] font-medium text-red-700">⚠️ No size guidance provided</p>
                        </div>
                      )}
                    </div>

                    {/* After */}
                    <div className="rounded-md border border-green-200 bg-green-50/30 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-xs font-semibold text-green-700 uppercase">After (AI Rewrite)</span>
                        <Badge variant="success" className="ml-auto text-[10px]">Est. 2.1% returns</Badge>
                      </div>
                      <p className="text-sm font-semibold">{selectedProduct.rewrite.title}</p>
                      <ul className="mt-2 space-y-1">
                        {selectedProduct.rewrite.bullets.map((b, i) => (
                          <li key={i} className={`text-xs ${i === 0 ? "font-medium text-amber-700" : "text-muted-foreground"}`}>
                            • {b}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                        {selectedProduct.rewrite.description}
                      </p>
                      <div className="mt-2 rounded bg-green-100 p-2">
                        <div className="flex items-center gap-1">
                          <Ruler className="h-3 w-3 text-green-700" />
                          <p className="text-[10px] font-medium text-green-700">Size Note:</p>
                        </div>
                        <p className="mt-0.5 text-[10px] text-green-800">{selectedProduct.rewrite.sizeNote}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="title" className="mt-4">
                  <ComparisonBlock
                    label="Title"
                    before={selectedProduct.original.title}
                    after={selectedProduct.rewrite.title}
                  />
                </TabsContent>

                <TabsContent value="bullets" className="mt-4 space-y-3">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium text-red-600">Original Bullets</p>
                      {selectedProduct.original.bullets.map((b, i) => (
                        <p key={i} className="border-l-2 border-red-200 pl-2 py-1 text-xs text-muted-foreground">• {b}</p>
                      ))}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-green-600">Rewritten Bullets</p>
                      {selectedProduct.rewrite.bullets.map((b, i) => (
                        <p key={i} className="border-l-2 border-green-200 pl-2 py-1 text-xs text-muted-foreground">• {b}</p>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="description" className="mt-4">
                  <ComparisonBlock
                    label="Description"
                    before={selectedProduct.original.description}
                    after={selectedProduct.rewrite.description}
                  />
                </TabsContent>

                <TabsContent value="size" className="mt-4">
                  <ComparisonBlock
                    label="Size Note"
                    before={selectedProduct.original.sizeNote || "(none provided)"}
                    after={selectedProduct.rewrite.sizeNote}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Prevention impact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Prevention Impact Estimate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <ImpactCard
                  label="Returns Prevented"
                  value={`~${Math.round(selectedProduct.returnCount * 0.68)}/mo`}
                  desc="Based on addressing top reason"
                />
                <ImpactCard
                  label="Cost Savings"
                  value={`₹${(selectedProduct.returnCount * 0.68 * 150).toFixed(0)}`}
                  desc="At ₹150 avg return cost"
                />
                <ImpactCard
                  label="Rating Impact"
                  value="+0.2 ★"
                  desc="Fewer negative reviews"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
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

function QualityDot({ score }: { score: number }) {
  const color = score > 70 ? "bg-green-500" : score > 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-[10px] text-muted-foreground">{score}/100</span>
    </div>
  );
}

function QualityRow({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {pass ? (
        <CheckCircle2 className="h-3 w-3 text-green-600" />
      ) : (
        <AlertCircle className="h-3 w-3 text-red-500" />
      )}
      <span className={pass ? "text-muted-foreground" : "text-red-600 font-medium"}>{label}</span>
    </div>
  );
}

function ComparisonBlock({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-md border border-red-200 bg-red-50/30 p-4">
        <p className="mb-2 text-xs font-semibold text-red-600">Before — {label}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{before}</p>
      </div>
      <div className="rounded-md border border-green-200 bg-green-50/30 p-4">
        <p className="mb-2 text-xs font-semibold text-green-600">After — {label}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{after}</p>
      </div>
    </div>
  );
}

function ImpactCard({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="text-lg font-bold text-primary">{value}</p>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{desc}</p>
    </div>
  );
}
