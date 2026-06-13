"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Globe,
  Hash,
  Leaf,
  MapPin,
  Package,
  Recycle,
  Shield,
  Sparkles,
  Star,
  Truck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Passport Data ─────────────────────────────────────────────────────────────

type TimelineEvent = {
  date: string;
  type: "purchased" | "returned" | "inspected" | "routed" | "matched" | "relisted" | "reused" | "donated" | "repaired" | "recycled";
  title: string;
  description: string;
  city: string;
  carbonDelta: number;
  icon: "package" | "recycle" | "scan" | "route" | "match" | "store" | "leaf" | "wrench" | "truck" | "sparkles";
};

type PassportRecord = {
  id: string;
  serialHash: string;
  title: string;
  brand: string;
  category: string;
  ownerCount: number;
  materialNotes: string[];
  cityTrail: string[];
  carbonSaved: number;
  greenCredits: number;
  currentCondition: string;
  timeline: TimelineEvent[];
  gradeHistory: { date: string; grade: string; score: number; route: string }[];
};

const passports: Record<string, PassportRecord> = {
  "pass-001": {
    id: "pass-001",
    serialHash: "rl-a7f3c2e1",
    title: "AeroStride Velocity Running Shoes",
    brand: "AeroStride",
    category: "FOOTWEAR",
    ownerCount: 2,
    materialNotes: ["Synthetic mesh upper", "EVA foam midsole", "Rubber outsole", "Recycled polyester laces"],
    cityTrail: ["Bengaluru", "Mysuru"],
    carbonSaved: 4.2,
    greenCredits: 35,
    currentCondition: "A",
    timeline: [
      { date: "2026-05-20", type: "purchased", title: "Purchased", description: "New item purchased from Amazon.in", city: "Bengaluru", carbonDelta: 0, icon: "package" },
      { date: "2026-06-10", type: "returned", title: "Returned", description: "Customer returned — size too tight (UK7)", city: "Bengaluru", carbonDelta: 0, icon: "recycle" },
      { date: "2026-06-10", type: "inspected", title: "AI Inspected", description: "Grade A, condition 92/100, no defects detected", city: "Bengaluru", carbonDelta: 0, icon: "scan" },
      { date: "2026-06-10", type: "routed", title: "Routed to Resale", description: "Excellent condition — marketplace listing created at ₹3,499", city: "Bengaluru", carbonDelta: 0, icon: "route" },
      { date: "2026-06-11", type: "relisted", title: "Listed on Marketplace", description: "Available for purchase with Health Card and fit guidance", city: "Bengaluru", carbonDelta: 0, icon: "store" },
      { date: "2026-06-12", type: "reused", title: "Purchased by New Owner", description: "Sold to buyer in Mysuru — 4.2 kg CO₂ saved", city: "Mysuru", carbonDelta: 4.2, icon: "leaf" },
    ],
    gradeHistory: [
      { date: "2026-06-10", grade: "A", score: 92, route: "RESALE" },
    ],
  },
  "pass-002": {
    id: "pass-002",
    serialHash: "rl-b8d4e5f2",
    title: "KitchenPro Mixer Grinder 750W",
    brand: "KitchenPro",
    category: "ELECTRONICS",
    ownerCount: 1,
    materialNotes: ["Stainless steel blades", "ABS plastic body", "Copper motor windings", "BPA-free jars"],
    cityTrail: ["Bengaluru"],
    carbonSaved: 3.1,
    greenCredits: 30,
    currentCondition: "B",
    timeline: [
      { date: "2026-04-15", type: "purchased", title: "Purchased", description: "New item purchased from Amazon.in", city: "Bengaluru", carbonDelta: 0, icon: "package" },
      { date: "2026-06-09", type: "returned", title: "Returned", description: "Jar capacity smaller than expected", city: "Bengaluru", carbonDelta: 0, icon: "recycle" },
      { date: "2026-06-09", type: "inspected", title: "AI Inspected", description: "Grade B, condition 74/100, packaging opened", city: "Bengaluru", carbonDelta: 0, icon: "scan" },
      { date: "2026-06-09", type: "routed", title: "Routed to Refurbish", description: "Electronics with quality >48, sent for inspection", city: "Bengaluru", carbonDelta: 0, icon: "route" },
      { date: "2026-06-12", type: "repaired", title: "Refurbished", description: "Motor tested, jar seal replaced, re-graded to B", city: "Bengaluru", carbonDelta: 3.1, icon: "wrench" },
    ],
    gradeHistory: [
      { date: "2026-06-09", grade: "B", score: 74, route: "REFURBISH" },
      { date: "2026-06-12", grade: "B", score: 78, route: "RESALE" },
    ],
  },
  "pass-003": {
    id: "pass-003",
    serialHash: "rl-c9e5f6a3",
    title: "CloudWalk Canvas Sneakers",
    brand: "CloudWalk",
    category: "FOOTWEAR",
    ownerCount: 2,
    materialNotes: ["Cotton canvas upper", "Vulcanized rubber sole", "Organic cotton laces", "Water-based adhesive"],
    cityTrail: ["Bengaluru", "Bengaluru"],
    carbonSaved: 4.5,
    greenCredits: 65,
    currentCondition: "A",
    timeline: [
      { date: "2026-06-01", type: "purchased", title: "Purchased", description: "New item purchased from Amazon.in", city: "Bengaluru", carbonDelta: 0, icon: "package" },
      { date: "2026-06-11", type: "returned", title: "Returned", description: "Duplicate order — sealed, unused", city: "Bengaluru", carbonDelta: 0, icon: "recycle" },
      { date: "2026-06-11", type: "inspected", title: "AI Inspected", description: "Grade A, condition 96/100, brand new sealed", city: "Bengaluru", carbonDelta: 0, icon: "scan" },
      { date: "2026-06-11", type: "routed", title: "Routed to Peer Exchange", description: "Nearby demand matched (3.4 km, score 82)", city: "Bengaluru", carbonDelta: 0, icon: "route" },
      { date: "2026-06-11", type: "matched", title: "Matched to Nearby Need", description: "Anonymous student program — UK8 footwear need", city: "Bengaluru", carbonDelta: 0, icon: "match" },
      { date: "2026-06-12", type: "reused", title: "Delivered to Recipient", description: "Amazon-managed handoff — 4.5 kg CO₂ saved, +45 credits", city: "Bengaluru", carbonDelta: 4.5, icon: "leaf" },
    ],
    gradeHistory: [
      { date: "2026-06-11", grade: "A", score: 96, route: "PEER_EXCHANGE" },
    ],
  },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const passport = passports[id];

  if (!passport) {
    return (
      <div className="space-y-4">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        </Link>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Passport not found.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try:{" "}
              {Object.keys(passports).map((pid) => (
                <Link key={pid} href={`/passport/${pid}`} className="text-primary underline mx-1">{pid}</Link>
              ))}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCarbonTimeline = passport.timeline.reduce((s, e) => s + e.carbonDelta, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Product Passport</h1>
          <p className="text-sm text-muted-foreground">{passport.title}</p>
        </div>
        <Badge variant="outline" className="hidden sm:flex">
          <Hash className="mr-1 h-3 w-3" />
          {passport.serialHash}
        </Badge>
      </div>

      {/* Summary strip */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <InfoItem icon={Hash} label="Serial" value={passport.serialHash} />
          <InfoItem icon={Package} label="Category" value={passport.category} />
          <InfoItem icon={Users} label="Owners" value={String(passport.ownerCount)} />
          <InfoItem icon={Leaf} label="CO₂ Saved" value={`${passport.carbonSaved} kg`} />
          <InfoItem icon={Sparkles} label="Credits" value={`+${passport.greenCredits}`} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: Timeline */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Lifetime Timeline
              </CardTitle>
              <CardDescription>Complete product journey from purchase to current state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {passport.timeline.map((event, i) => (
                  <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Vertical line */}
                    {i < passport.timeline.length - 1 && (
                      <div className="absolute left-[15px] top-8 h-full w-0.5 bg-border" />
                    )}
                    {/* Icon */}
                    <div className={`relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 ${
                      event.carbonDelta > 0 ? "border-green-500 bg-green-50" : "border-primary bg-primary/10"
                    }`}>
                      <TimelineIcon type={event.icon} carbonDelta={event.carbonDelta} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{event.title}</p>
                        <span className="text-[10px] text-muted-foreground">{event.date}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />{event.city}
                        </span>
                        {event.carbonDelta > 0 && (
                          <Badge variant="success" className="text-[9px]">
                            +{event.carbonDelta} kg CO₂ saved
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Condition History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Condition History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {passport.gradeHistory.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                    {entry.grade}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Grade {entry.grade} — Score {entry.score}/100</span>
                      <Badge variant="outline" className="text-[10px]">{entry.route.replace("_", " ")}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Impact + Materials + Future */}
        <div className="space-y-4">
          {/* Sustainability impact */}
          <Card className="border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Leaf className="h-4 w-4 text-green-700" />
                Sustainability Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-green-50 p-4 text-center">
                <p className="text-3xl font-bold text-green-700">{totalCarbonTimeline} kg</p>
                <p className="mt-1 text-sm text-green-600">CO₂ saved through circular routing</p>
              </div>
              <div className="rounded-md bg-green-50 p-3 text-center">
                <p className="text-xl font-bold text-green-700">+{passport.greenCredits}</p>
                <p className="text-xs text-green-600">Green Credits generated</p>
              </div>
              <div className="space-y-1.5 text-xs">
                <p className="font-medium">Carbon by route type:</p>
                {[
                  { route: "PEER_EXCHANGE", value: "4.5 kg" },
                  { route: "RESALE", value: "4.2 kg" },
                  { route: "DONATE", value: "3.8 kg" },
                  { route: "REFURBISH", value: "3.1 kg" },
                  { route: "LIQUIDATE", value: "1.2 kg" },
                ].map((r) => (
                  <div key={r.route} className="flex justify-between text-muted-foreground">
                    <span>{r.route.replace("_", " ")}</span>
                    <span>{r.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* City Trail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                City Trail
              </CardTitle>
              <CardDescription>City-level only — no address data stored</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {passport.cityTrail.map((city, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="relative flex flex-col items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                        <MapPin className="h-3 w-3 text-primary" />
                      </div>
                      {i < passport.cityTrail.length - 1 && (
                        <div className="absolute top-6 h-4 w-0.5 bg-border" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{city}</p>
                      <p className="text-[10px] text-muted-foreground">Owner #{i + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Materials */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Material Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {passport.materialNotes.map((note, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{note}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Future Vision */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-amber-500" />
                Future Vision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FutureItem
                icon={Globe}
                title="Cross-City Matching"
                desc="Move products between cities using existing logistics lanes when local demand is low."
              />
              <FutureItem
                icon={Shield}
                title="Lifetime Digital Passport"
                desc="Blockchain-anchored provenance tracking across unlimited owners and repair events."
              />
              <FutureItem
                icon={Recycle}
                title="Material Recovery Tracking"
                desc="End-of-life material flow tracking for closed-loop manufacturing."
              />
              <FutureItem
                icon={Star}
                title="Verified Sustainability Score"
                desc="Third-party audited circular economy score for ESG reporting."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoItem({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function TimelineIcon({ type, carbonDelta }: { type: string; carbonDelta: number }) {
  const cls = carbonDelta > 0 ? "h-3.5 w-3.5 text-green-600" : "h-3.5 w-3.5 text-primary";
  switch (type) {
    case "package": return <Package className={cls} />;
    case "recycle": return <Recycle className={cls} />;
    case "scan": return <Sparkles className={cls} />;
    case "route": return <ArrowRightLeft className={cls} />;
    case "match": return <Users className={cls} />;
    case "store": return <Package className={cls} />;
    case "leaf": return <Leaf className={cls} />;
    case "wrench": return <Wrench className={cls} />;
    case "truck": return <Truck className={cls} />;
    default: return <CheckCircle2 className={cls} />;
  }
}

function FutureItem({ icon: Icon, title, desc }: { icon: typeof Globe; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-dashed p-2.5">
      <Icon className="mt-0.5 h-4 w-4 flex-none text-amber-500" />
      <div>
        <p className="text-xs font-medium">{title}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
