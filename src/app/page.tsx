"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Camera,
  CheckCircle2,
  ImagePlus,
  Leaf,
  Package,
  Recycle,
  Shield,
  Sparkles,
  Star,
  Truck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  gradeReturn,
  sizeRecommendation,
  type HealthCard,
  type ProductCategory,
  type ReturnDraft,
} from "@/lib/reloop";

const categoryOptions: { value: ProductCategory; label: string; icon: string }[] = [
  { value: "FOOTWEAR", label: "Footwear", icon: "👟" },
  { value: "APPAREL", label: "Apparel", icon: "👕" },
  { value: "ELECTRONICS", label: "Electronics", icon: "🔌" },
  { value: "HOME", label: "Home", icon: "🏠" },
  { value: "TOYS", label: "Toys", icon: "🧸" },
  { value: "BOOKS", label: "Books", icon: "📚" },
  { value: "OTHER", label: "Other", icon: "📦" },
];

const reasonSuggestions = [
  "Doesn't fit",
  "Changed my mind",
  "Duplicate order",
  "Not as described",
  "Defective/damaged",
  "Better price found",
];

export default function CustomerFlowPage() {
  const [step, setStep] = useState<"form" | "analyzing" | "result">("form");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [draft, setDraft] = useState<ReturnDraft>({
    title: "",
    brand: "",
    category: "FOOTWEAR",
    size: "",
    region: "",
    reason: "",
    details: "",
    imageCount: 0,
  });
  const [healthCard, setHealthCard] = useState<HealthCard | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateDraft<K extends keyof ReturnDraft>(key: K, value: ReturnDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(
      (f) => f.size <= 5 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(f.type)
    );
    const newImages = [...images, ...validFiles].slice(0, 6);
    setImages(newImages);

    const newPreviews = newImages.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
    updateDraft("imageCount", newImages.length);
  }

  function removeImage(index: number) {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    URL.revokeObjectURL(previews[index]);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
    updateDraft("imageCount", newImages.length);
  }

  async function analyzeNextLife() {
    if (!draft.title || !draft.reason) return;
    setStep("analyzing");

    // Simulate AI processing time for demo feel
    await new Promise((r) => setTimeout(r, 1800));

    const result = gradeReturn({ ...draft, imageCount: images.length || draft.imageCount });
    setHealthCard(result);
    setStep("result");
  }

  function startOver() {
    setStep("form");
    setHealthCard(null);
    setImages([]);
    setPreviews([]);
    setDraft({
      title: "",
      brand: "",
      category: "FOOTWEAR",
      size: "",
      region: "",
      reason: "",
      details: "",
      imageCount: 0,
    });
  }

  const fitTip = draft.brand && draft.size && draft.category
    ? sizeRecommendation(draft.brand, draft.size, draft.category)
    : null;

  // ─── Analyzing state ────────────────────────────────────────────────────────
  if (step === "analyzing") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <Sparkles className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Analyzing your item...</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AI is checking condition, finding the best route, and looking for nearby demand.
          </p>
        </div>
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Vision analysis</span>
            <span>Routing logic</span>
            <span>Matching</span>
          </div>
          <Progress value={66} className="animate-pulse" />
        </div>
      </div>
    );
  }

  // ─── Result state ───────────────────────────────────────────────────────────
  if (step === "result" && healthCard) {
    return (
      <div className="space-y-6">
        {/* Success banner */}
        <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">We found its next life.</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {draft.title} — Grade {healthCard.grade} · {healthCard.routeLabel}
              </p>
            </div>
            <Button variant="outline" onClick={startOver}>
              Submit another item
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Health Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Product Health Card
                  </CardTitle>
                  <CardDescription>{draft.title}</CardDescription>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-sm">
                  {healthCard.grade}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <ScoreCard label="Condition" value={healthCard.conditionScore} max={98} />
                <ScoreCard label="Quality" value={healthCard.qualityScore} max={96} />
                <ScoreCard label="History" value={healthCard.historyScore} max={94} />
              </div>

              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">AI Confidence</span>
                  <span className="font-semibold">{healthCard.confidence}%</span>
                </div>
                <Progress value={healthCard.confidence} />
              </div>

              <div className="space-y-2">
                {healthCard.riskFlags.map((flag, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                    <span className="text-muted-foreground">{flag}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Route + Credits + Match */}
          <div className="space-y-4">
            {/* Route card */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <RouteIcon route={healthCard.route} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{healthCard.routeLabel}</p>
                    <p className="text-sm text-muted-foreground">{healthCard.routeReason}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-md bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">What happens next</p>
                  <p className="mt-1 text-sm">{healthCard.nextAction}</p>
                </div>
              </CardContent>
            </Card>

            {/* Green credits */}
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Leaf className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-800">+{healthCard.greenCredits}</p>
                  <p className="text-sm text-green-700">Green Credits earned</p>
                </div>
                <div className="ml-auto rounded-md bg-green-100 px-3 py-1.5">
                  <p className="text-xs font-medium text-green-800">
                    ~{(healthCard.greenCredits * 0.1).toFixed(1)} kg CO₂ saved
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Nearby match */}
            {healthCard.needMatch ? (
              <Card className="border-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    <p className="font-medium">Anonymous Nearby Demand Found</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {healthCard.needMatch.note}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MiniInfo label="Pool" value={healthCard.needMatch.pool.split(" ").slice(0, 2).join(" ")} />
                    <MiniInfo label="Distance" value={`${healthCard.needMatch.distanceKm} km`} />
                    <MiniInfo label="Demand" value={healthCard.needMatch.demand} />
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-muted p-2.5">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      No identity exchange. Amazon handles pickup and delivery.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center gap-3 p-5">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">No stronger nearby demand found</p>
                    <p className="text-xs text-muted-foreground">
                      Your item will be processed via the {healthCard.routeLabel.toLowerCase()} channel.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-2">
              <TrustBadge icon={Shield} text="Zero identity exposure" />
              <TrustBadge icon={Truck} text="Free managed pickup" />
              <TrustBadge icon={Recycle} text="Tracked sustainability" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form state (default) ───────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="rounded-xl border bg-gradient-to-br from-white via-white to-primary/5 p-6 sm:p-8">
        <Badge variant="outline" className="mb-4">
          <Recycle className="mr-1 h-3 w-3" />
          Powered by ReLoop
        </Badge>
        <h1 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
          Return it. Outgrow it.{" "}
          <span className="text-primary">ReLoop finds its next best owner.</span>
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Upload once. Our AI grades, routes, and matches your item to its highest-value second
          life — resale, donation, refurbishment, or anonymous nearby need. No hassle, no
          customer-to-customer chat. Amazon handles everything.
        </p>
        <div className="mt-5 flex flex-wrap gap-4">
          <Signal icon={Camera} text="AI vision grading" />
          <Signal icon={ArrowRightLeft} text="Anonymous matching" />
          <Signal icon={Leaf} text="Green credits earned" />
          <Signal icon={Shield} text="Zero identity exposure" />
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tell us about your item</CardTitle>
            <CardDescription>
              The more detail you provide, the better our AI can grade and route it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Image upload area */}
            <div>
              <Label className="text-sm">Product Images</Label>
              <p className="mb-2 text-xs text-muted-foreground">Up to 6 images · JPEG, PNG, WebP · Max 5 MB each</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {previews.map((src, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-md border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:block"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 6 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center rounded-md border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="mt-1 text-[10px]">Add</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Category selector */}
            <div>
              <Label className="text-sm">Category</Label>
              <div className="mt-1.5 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => updateDraft("category", cat.value)}
                    className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors ${
                      draft.category === cat.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Product details grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Product Name">
                <Input
                  placeholder="e.g. AeroStride Velocity Running Shoes"
                  value={draft.title}
                  onChange={(e) => updateDraft("title", e.target.value)}
                />
              </Field>
              <Field label="Brand">
                <Input
                  placeholder="e.g. AeroStride"
                  value={draft.brand}
                  onChange={(e) => updateDraft("brand", e.target.value)}
                />
              </Field>
              <Field label="Size / Variant">
                <Input
                  placeholder="e.g. UK7, M, 128GB"
                  value={draft.size}
                  onChange={(e) => updateDraft("size", e.target.value)}
                />
              </Field>
              <Field label="Your Region">
                <Input
                  placeholder="e.g. North Bengaluru"
                  value={draft.region}
                  onChange={(e) => updateDraft("region", e.target.value)}
                />
              </Field>
            </div>

            {/* Return reason with quick chips */}
            <div>
              <Label className="text-sm">Why are you returning or passing this on?</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {reasonSuggestions.map((r) => (
                  <button
                    key={r}
                    onClick={() => updateDraft("reason", r)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      draft.reason === r
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Input
                className="mt-2"
                placeholder="Or type your own reason..."
                value={draft.reason}
                onChange={(e) => updateDraft("reason", e.target.value)}
              />
            </div>

            {/* Details */}
            <Field label="Anything else we should know?">
              <Textarea
                placeholder="Condition details, defects, or context that helps grading..."
                value={draft.details}
                onChange={(e) => updateDraft("details", e.target.value)}
                rows={3}
              />
            </Field>

            {/* Fit tip */}
            {fitTip && fitTip !== "Fit risk is normal. Keep your usual size unless you are between sizes." && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm">
                <Star className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Fit Intelligence</p>
                  <p className="mt-0.5 text-amber-800">{fitTip}</p>
                </div>
              </div>
            )}

            {/* Submit button */}
            <Button
              className="w-full py-6 text-base"
              onClick={analyzeNextLife}
              disabled={!draft.title || !draft.reason}
            >
              <Sparkles className="h-4 w-4" />
              Analyze Next Life
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Right side: How it works + trust */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How ReLoop Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { step: "1", title: "Upload & describe", desc: "Add photos and tell us why you're done with this item." },
                { step: "2", title: "AI grades instantly", desc: "Vision + text analysis produces a Health Card in seconds." },
                { step: "3", title: "Best route assigned", desc: "Resale, donation, refurbish, or anonymous nearby match." },
                { step: "4", title: "Amazon handles the rest", desc: "Free pickup, no chat, no identity exposure. Just done." },
              ].map((s) => (
                <div key={s.step} className="flex gap-3">
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What You Earn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { route: "Peer Exchange", credits: 45, co2: "4.5 kg" },
                { route: "Donation", credits: 40, co2: "3.8 kg" },
                { route: "Resale", credits: 30, co2: "4.2 kg" },
                { route: "Refurbish", credits: 30, co2: "3.1 kg" },
              ].map((r) => (
                <div key={r.route} className="flex items-center justify-between rounded-md border p-2.5">
                  <span className="text-sm">{r.route}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">+{r.credits} credits</Badge>
                    <span className="text-xs text-muted-foreground">{r.co2} CO₂</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <Shield className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Your privacy is protected</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No customer-to-customer contact. Anonymous pool matching at city level
                  only. Amazon manages all logistics.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function Signal({ icon: Icon, text }: { icon: typeof Camera; text: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {text}
    </div>
  );
}

function ScoreCard({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      <div className="mt-2 h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-medium">{value}</p>
    </div>
  );
}

function TrustBadge({ icon: Icon, text }: { icon: typeof Shield; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-md border p-3 text-center">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[10px] font-medium text-muted-foreground">{text}</span>
    </div>
  );
}

function RouteIcon({ route }: { route: string }) {
  switch (route) {
    case "PEER_EXCHANGE":
      return <ArrowRightLeft className="h-5 w-5 text-primary" />;
    case "RESALE":
      return <Package className="h-5 w-5 text-primary" />;
    case "DONATE":
      return <Leaf className="h-5 w-5 text-primary" />;
    case "REFURBISH":
      return <Sparkles className="h-5 w-5 text-primary" />;
    default:
      return <Recycle className="h-5 w-5 text-primary" />;
  }
}
