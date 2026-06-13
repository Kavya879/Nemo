"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Footprints,
  Leaf,
  Package,
  Ruler,
  Shield,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// ─── Data ──────────────────────────────────────────────────────────────────────

type BrandFit = {
  brand: string;
  fitType: "narrow" | "regular" | "wide";
  sizeAdjustment: number;
  confidence: number;
  sampleSize: number;
  recommendation: string;
  note: string;
};

type UserProfile = {
  name: string;
  usualSize: string;
  preferredFit: string;
  footWidth: string;
};

const brandFitRules: Record<string, BrandFit> = {
  AeroStride: {
    brand: "AeroStride",
    fitType: "narrow",
    sizeAdjustment: 1,
    confidence: 87,
    sampleSize: 284,
    recommendation: "If you usually wear UK7, choose UK8 for this brand.",
    note: "Based on 284 return cases. 68% of UK7 returns cite size as reason.",
  },
  CloudWalk: {
    brand: "CloudWalk",
    fitType: "regular",
    sizeAdjustment: 0,
    confidence: 72,
    sampleSize: 156,
    recommendation: "True to size. Order your usual UK size.",
    note: "Standard canvas fit with minimal size-related returns.",
  },
  TrailMaster: {
    brand: "TrailMaster",
    fitType: "narrow",
    sizeAdjustment: 1,
    confidence: 78,
    sampleSize: 92,
    recommendation: "Size up half a size for thick socks. Runs snug in the toe box.",
    note: "Performance hiking fit — not suitable for wide feet without wide variant.",
  },
  SprintMax: {
    brand: "SprintMax",
    fitType: "wide",
    sizeAdjustment: -1,
    confidence: 65,
    sampleSize: 48,
    recommendation: "Runs large. Consider ordering one size down.",
    note: "Generous fit with extra toe box room.",
  },
};

const sizes = ["UK5", "UK6", "UK7", "UK8", "UK9", "UK10", "UK11"];
const brands = Object.keys(brandFitRules);

const userProfile: UserProfile = {
  name: "Priya",
  usualSize: "UK7",
  preferredFit: "regular",
  footWidth: "regular",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FitPage() {
  const [selectedBrand, setSelectedBrand] = useState("AeroStride");
  const [selectedSize, setSelectedSize] = useState("UK7");
  const [showResult, setShowResult] = useState(false);

  const fitRule = brandFitRules[selectedBrand];
  const recommendedSize = getRecommendedSize(selectedSize, fitRule.sizeAdjustment);
  const returnRisk = getReturnRisk(selectedSize, fitRule);
  const isRisky = selectedSize === userProfile.usualSize && fitRule.sizeAdjustment !== 0;
  const isOptimal = selectedSize === recommendedSize;

  function handleAnalyze() {
    setShowResult(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Return Prevention</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-purchase fit intelligence that prevents returns before they happen.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main: Checkout-style widget */}
        <div className="space-y-4">
          {/* Product card (checkout-style) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Checkout — Size Selection</CardTitle>
              </div>
              <CardDescription>Simulates the moment before a customer clicks Buy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Product display */}
              <div className="flex gap-4 rounded-md border p-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted text-3xl">
                  👟
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedBrand} Velocity Running Shoes</p>
                  <p className="text-sm text-muted-foreground">Performance running · {fitRule.fitType} fit</p>
                  <p className="mt-1 text-lg font-semibold">₹4,999</p>
                </div>
              </div>

              {/* Brand selector */}
              <div>
                <label className="text-sm font-medium">Brand</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {brands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => { setSelectedBrand(brand); setShowResult(false); }}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        selectedBrand === brand
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted"
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size selector */}
              <div>
                <label className="text-sm font-medium">Select Size</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Your profile size: <span className="font-semibold">{userProfile.usualSize}</span> · Preferred fit: {userProfile.preferredFit}
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {sizes.map((size) => {
                    const isRecommended = size === recommendedSize && fitRule.sizeAdjustment !== 0;
                    const isUserUsual = size === userProfile.usualSize;
                    return (
                      <button
                        key={size}
                        onClick={() => { setSelectedSize(size); setShowResult(false); }}
                        className={`relative rounded-md border p-2 text-center text-sm transition-colors ${
                          selectedSize === size
                            ? "border-primary bg-primary text-primary-foreground font-medium"
                            : isRecommended
                            ? "border-green-400 bg-green-50 hover:bg-green-100"
                            : "hover:bg-muted"
                        }`}
                      >
                        {size.replace("UK", "")}
                        {isRecommended && selectedSize !== size && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[8px] text-white">✓</span>
                        )}
                        {isUserUsual && fitRule.sizeAdjustment !== 0 && selectedSize !== size && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">!</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
                  {fitRule.sizeAdjustment !== 0 && (
                    <>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Recommended</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Higher risk</span>
                    </>
                  )}
                </div>
              </div>

              {/* Analyze button */}
              <Button className="w-full py-5" onClick={handleAnalyze}>
                <Sparkles className="h-4 w-4" />
                Check Fit Risk
                <ArrowRight className="h-4 w-4" />
              </Button>

              {/* Inline warning (always visible if risky selection) */}
              {isRisky && (
                <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      ⚠️ This brand runs {fitRule.fitType === "narrow" ? "small" : "large"}
                    </p>
                    <p className="mt-0.5 text-sm text-amber-800">{fitRule.recommendation}</p>
                    <button
                      onClick={() => { setSelectedSize(recommendedSize); setShowResult(false); }}
                      className="mt-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Switch to {recommendedSize} →
                    </button>
                  </div>
                </div>
              )}

              {isOptimal && fitRule.sizeAdjustment !== 0 && (
                <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Great choice! This is the recommended size.</p>
                    <p className="mt-0.5 text-xs text-green-700">
                      Based on {fitRule.sampleSize} return cases for this brand.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result panel */}
          {showResult && (
            <Card className={isRisky ? "border-amber-200" : "border-green-200"}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Ruler className="h-4 w-4 text-primary" />
                  Fit Analysis Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ResultBox label="Selected" value={selectedSize} />
                  <ResultBox label="Recommended" value={recommendedSize} highlight={!isOptimal} />
                  <ResultBox label="Return Risk" value={returnRisk.label} alert={returnRisk.level === "high"} />
                  <ResultBox label="Confidence" value={`${fitRule.confidence}%`} />
                </div>

                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm font-medium">AI Explanation</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isOptimal
                      ? `You selected ${selectedSize} which matches our recommendation for ${selectedBrand}. This brand has a ${fitRule.fitType} fit profile. Based on ${fitRule.sampleSize} return cases, this size has the lowest return probability.`
                      : `You selected ${selectedSize}, but ${selectedBrand} runs ${fitRule.fitType === "narrow" ? "small/narrow" : "large/wide"}. Our data from ${fitRule.sampleSize} returns shows ${(returnRisk.pct).toFixed(0)}% of buyers selecting ${selectedSize} end up returning due to size mismatch. We recommend ${recommendedSize} instead.`
                    }
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Return Probability</span>
                    <span className={`text-xs font-bold ${returnRisk.level === "high" ? "text-red-600" : returnRisk.level === "medium" ? "text-amber-600" : "text-green-600"}`}>
                      {returnRisk.pct}%
                    </span>
                  </div>
                  <Progress value={returnRisk.pct} className="mt-1.5" />
                </div>

                {!isOptimal && (
                  <Button
                    variant="outline"
                    className="w-full border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => { setSelectedSize(recommendedSize); setShowResult(false); }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Switch to Recommended: {recommendedSize}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Impact + Data */}
        <div className="space-y-4">
          {/* User profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Footprints className="h-4 w-4 text-primary" />
                Your Size Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ProfileRow label="Usual Size" value={userProfile.usualSize} />
              <ProfileRow label="Preferred Fit" value={userProfile.preferredFit} />
              <ProfileRow label="Foot Width" value={userProfile.footWidth} />
              <ProfileRow label="Name" value={userProfile.name} />
            </CardContent>
          </Card>

          {/* Brand fit data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Brand Fit Data: {selectedBrand}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ProfileRow label="Fit Type" value={fitRule.fitType} />
              <ProfileRow label="Size Adjustment" value={fitRule.sizeAdjustment === 0 ? "None (true to size)" : `${fitRule.sizeAdjustment > 0 ? "+" : ""}${fitRule.sizeAdjustment} size(s)`} />
              <ProfileRow label="Confidence" value={`${fitRule.confidence}%`} />
              <ProfileRow label="Sample Size" value={`${fitRule.sampleSize} returns`} />
              <div className="mt-2 rounded-md bg-muted p-2.5">
                <p className="text-[10px] text-muted-foreground">{fitRule.note}</p>
              </div>
            </CardContent>
          </Card>

          {/* Return prevention impact */}
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-green-800">
                <TrendingDown className="h-4 w-4" />
                Prevention Impact
              </CardTitle>
              <CardDescription className="text-green-700">What this widget prevents system-wide</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ImpactRow icon={Package} label="Returns prevented" value="~19/month" desc="For this brand alone" />
              <ImpactRow icon={DollarSign} label="Cost savings" value="₹2,850/mo" desc="At ₹150 per return" />
              <ImpactRow icon={Leaf} label="CO₂ not wasted" value="38 kg/mo" desc="Avoided reverse logistics" />
              <ImpactRow icon={TrendingUp} label="Procurement efficiency" value="+12%" desc="Less overstock needed" />
              <ImpactRow icon={BarChart3} label="Customer satisfaction" value="+0.3 ★" desc="Fewer negative reviews" />
            </CardContent>
          </Card>

          {/* How it helps procurement */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-amber-500" />
                Procurement Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                Size-related returns create hidden procurement waste:
              </p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-primary" />
                  <span>Returned items need re-grading, re-packaging, and re-listing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-primary" />
                  <span>Overstock of popular sizes to absorb return volume</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-primary" />
                  <span>Reverse logistics cost ₹150–₹400 per return shipment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-primary" />
                  <span>Pre-purchase fit intelligence reduces all of these at the source</span>
                </li>
              </ul>
              <div className="mt-3 rounded-md border border-dashed p-2.5 text-center">
                <p className="font-medium text-primary">12% less overstock needed</p>
                <p className="text-[10px] text-muted-foreground">When size returns drop by 68%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRecommendedSize(currentSize: string, adjustment: number): string {
  const num = parseInt(currentSize.replace("UK", ""));
  return `UK${num + adjustment}`;
}

function getReturnRisk(selectedSize: string, fitRule: BrandFit): { label: string; level: "low" | "medium" | "high"; pct: number } {
  const num = parseInt(selectedSize.replace("UK", ""));
  const optimalNum = num + fitRule.sizeAdjustment;
  const diff = Math.abs(num - optimalNum + fitRule.sizeAdjustment);

  if (diff === 0) return { label: "Low", level: "low", pct: 4 };
  if (diff === 1 && fitRule.sizeAdjustment !== 0) return { label: "High", level: "high", pct: 68 };
  return { label: "Medium", level: "medium", pct: 25 };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ResultBox({ label, value, highlight, alert }: { label: string; value: string; highlight?: boolean; alert?: boolean }) {
  return (
    <div className={`rounded-md border p-2.5 text-center ${highlight ? "border-green-300 bg-green-50" : alert ? "border-red-300 bg-red-50" : ""}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${highlight ? "text-green-700" : alert ? "text-red-700" : ""}`}>{value}</p>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium capitalize">{value}</span>
    </div>
  );
}

function ImpactRow({ icon: Icon, label, value, desc }: { icon: typeof Package; label: string; value: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 flex-none text-green-700" />
      <div className="flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <span className="text-xs font-bold text-green-800">{value}</span>
    </div>
  );
}
