"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { GradeResultDTO, ListingDTO, VerificationAssessmentDTO } from "@/types/dto";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/GradeBadge";
import { LoadingState } from "@/components/flow/States";
import { PhotoUploader, type UploadedPhoto } from "@/components/flow/PhotoUploader";
import { VerificationPanel } from "@/components/VerificationPanel";
import { useCategories } from "@/lib/use-categories";

function SellInner() {
  const search = useSearchParams();
  const resellItemId = search.get("itemId");
  const { categories } = useCategories();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  const [prefilling, setPrefilling] = useState<boolean>(!!resellItemId);
  const [locked, setLocked] = useState(false); // fields locked when reselling an owned item
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ListingDTO | null>(null);
  const [aiGrade, setAiGrade] = useState<GradeResultDTO | null>(null);
  const [verification, setVerification] = useState<VerificationAssessmentDTO | null>(null);

  // Resell flow: prefill from the owned item + enforce "only after return window closes".
  useEffect(() => {
    if (!resellItemId) return;
    (async () => {
      try {
        const [items, orders] = await Promise.all([apiClient.getItems(), apiClient.getOrders()]);
        const item = items.find((i) => i.id === resellItemId);
        if (!item) {
          setBlockedReason("That item could not be found.");
          return;
        }
        setName(item.name);
        setCategory(item.category);
        setBrand(item.brand ?? "");
        setOriginalPrice(String(item.originalPrice));
        setLocked(true);

        // #18: cannot resell while the order is still within its return window.
        const order = orders.find((o) => o.order.item.id === resellItemId);
        if (order && order.returnEligible) {
          setBlockedReason(
            `This item is still within its return window (${order.returnDaysLeft} day(s) left). You can resell it only after the return period is over — return it for a refund instead, or wait for the window to close.`,
          );
        }
      } catch {
        setBlockedReason("Could not load the item for resale.");
      } finally {
        setPrefilling(false);
      }
    })();
  }, [resellItemId]);

  const mrp = Number(originalPrice) || 0;
  const ask = Number(askingPrice) || 0;
  const valid =
    !blockedReason &&
    name.trim() &&
    category.trim() &&
    mrp > 0 &&
    ask > 0 &&
    ask <= mrp &&
    photos.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      // The actual uploaded photo (front preferred) becomes the product image —
      // so the listing shows the real image the seller uploaded, not a stand-in.
      const primaryPhoto = photos.find((p) => p.role === "front") ?? photos[0];
      const uploadedImageUrl = primaryPhoto?.preview;

      // Reselling an owned item → list the existing item; otherwise create a new one.
      setBusyLabel("Preparing item…");
      const itemId = resellItemId
        ? resellItemId
        : (
            await apiClient.createItem({
              name: name.trim(),
              category,
              brand: brand.trim() || undefined,
              originalPrice: mrp,
              imageUrl: uploadedImageUrl,
            })
          ).id;

      // #19: AI grades the uploaded photos — the listing condition + Product
      // Health Card come from the grading result, not a self-declared value.
      setBusyLabel("Verifying & AI grading your photos…");
      const { grade: graded, verification: ver } = await apiClient.grade(
        photos.map((p) => ({ base64: p.base64, mimeType: p.mimeType, role: p.role })),
        itemId,
      );
      setAiGrade(graded);
      setVerification(ver);

      setBusyLabel("Creating your listing…");
      const listing = await apiClient.createListing({
        itemId,
        grade: graded.grade,
        confidence: graded.confidence,
        flaws: graded.flaws,
        price: ask,
        pricePct: Number((ask / mrp).toFixed(3)),
        photoUrl: uploadedImageUrl ?? null,
        history: [
          resellItemId ? "Resold by owner (return window closed)" : "Listed by seller on Amazon Nemo",
          `AI-graded ${graded.grade} (${Math.round(graded.confidence * 100)}% confidence)`,
        ],
      });
      setCreated(listing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not list your item");
    } finally {
      setSubmitting(false);
    }
  }

  if (prefilling) return <div className="p-8"><LoadingState label="Loading item…" /></div>;

  if (created) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-3xl">✅</div>
        <h1 className="text-2xl font-bold">Your item is live!</h1>
        <p className="mt-1 text-sm text-storm">{created.title}</p>
        {aiGrade && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-sm text-storm">AI-verified condition:</span>
            <GradeBadge grade={aiGrade.grade} showLabel />
            <span className="text-xs text-storm">({Math.round(aiGrade.confidence * 100)}%)</span>
          </div>
        )}
        <p className="mt-1 text-2xl font-bold text-priceRed">₹{created.price.toLocaleString("en-IN")}</p>
        {verification && (
          <div className="mt-5 text-left">
            <VerificationPanel
              verification={verification}
              finalGrade={aiGrade?.grade}
              qualityConfidence={aiGrade?.confidence}
            />
          </div>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <Link href={`/marketplace/${created.id}`}>
            <Button size="lg">View your listing →</Button>
          </Link>
          <Link href="/sell">
            <Button size="lg" variant="secondary">List another item</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold">{resellItemId ? "Resell on Amazon Nemo" : "Sell on Amazon Nemo"}</h1>
      <p className="text-sm text-storm">
        {resellItemId
          ? "List an item you own (its return window has closed) for second-life resale."
          : "List your own item for second-life resale — including products not already on the platform."}
      </p>

      {blockedReason && (
        <div className="mt-4 rounded border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
          {blockedReason}{" "}
          <Link href="/orders" className="font-medium underline">
            Back to Your Orders
          </Link>
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4 rounded border border-line bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-semibold">Product name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={locked}
            placeholder="e.g. Vintage Leather Satchel"
            className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-mist/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Category</label>
            <input
              list="catalog-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={locked}
              placeholder="Pick or type a category"
              className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-mist/50"
            />
            <datalist id="catalog-categories">
              {categories.map((c) => (
                <option key={c.category} value={c.category} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Brand (optional)</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={locked}
              className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-mist/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Original price (₹) *</label>
            <input
              type="number"
              min="1"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              disabled={locked}
              className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-mist/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Your asking price (₹) *</label>
            <input
              type="number"
              min="1"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              className="w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
        </div>
        {ask > 0 && mrp > 0 && ask > mrp && (
          <p className="text-xs text-danger">Asking price can&apos;t exceed the original price.</p>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold">
            Photos for AI grading * (the Product Health Card / passport)
          </label>
          <p className="mb-2 text-xs text-storm">
            Our AI inspects your photos and verifies the condition grade — you don&apos;t set it
            manually.
          </p>
          <PhotoUploader photos={photos} onChange={setPhotos} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" disabled={!valid || submitting} className="w-full">
          {submitting ? busyLabel || "Listing…" : "AI-grade & list my item"}
        </Button>
      </form>
    </div>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={<div className="p-8"><LoadingState label="Loading…" /></div>}>
      <SellInner />
    </Suspense>
  );
}
