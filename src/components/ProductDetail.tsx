"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { CreditsResultDTO, ListingDTO } from "@/types/dto";
import { ProductHealthCard } from "@/components/ProductHealthCard";
import { PreventionBanner } from "@/components/PreventionBanner";
import { CreditsReward } from "@/components/CreditsReward";
import { GradeBadge } from "@/components/GradeBadge";
import { LoadingState, ErrorState } from "@/components/flow/States";

function categoryIcon(cat?: string) {
  return cat === "Footwear" ? "👟" : cat === "Electronics" ? "🎧" : cat === "Apparel" ? "🧥" : "📦";
}

export function ProductDetail({ id }: { id: string }) {
  const [listing, setListing] = useState<ListingDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [reward, setReward] = useState<CreditsResultDTO | null>(null);

  function load() {
    setError(null);
    setListing(null);
    apiClient
      .getListing(id)
      .then(setListing)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load product"));
  }
  useEffect(load, [id]);

  /** Add to cart — NO credits are awarded here (only on purchase). */
  function addToCart() {
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  }

  /** Complete the purchase — credits are awarded ONLY here, after a real buy. */
  async function purchase() {
    if (!listing?.item) return;
    setBuying(true);
    setError(null);
    try {
      const result = await apiClient.awardCredits({
        action: "RESELL_AS_IS",
        category: listing.item.category,
        originalPrice: listing.item.originalPrice,
        itemId: listing.itemId,
      });
      setReward(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete the purchase");
    } finally {
      setBuying(false);
    }
  }

  if (error) return <div className="mx-auto max-w-6xl p-4"><ErrorState message={error} onRetry={load} /></div>;
  if (!listing) return <div className="mx-auto max-w-6xl p-4"><LoadingState label="Loading product…" /></div>;

  const category = listing.item?.category ?? "general";
  const original = listing.item?.originalPrice ?? Math.round(listing.price / (listing.pricePct || 1));
  const saved = Math.max(original - listing.price, 0);
  const rating = 3 + listing.healthCard.confidence * 2;

  return (
    <div className="mx-auto max-w-6xl px-4 py-3">
      {/* Breadcrumb */}
      <nav className="mb-3 text-xs text-link">
        <Link href="/marketplace" className="hover:text-linkHover hover:underline">Second-Life</Link>
        <span className="mx-1 text-storm">›</span>
        <Link href={`/marketplace?q=${encodeURIComponent(category)}`} className="hover:text-linkHover hover:underline">
          {category}
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-6 rounded bg-white p-5 lg:grid-cols-12">
        {/* Image */}
        <div className="lg:col-span-4">
          <div className="flex h-80 items-center justify-center rounded bg-mist/40 text-8xl">
            {categoryIcon(category)}
          </div>
        </div>

        {/* Center details */}
        <div className="space-y-3 lg:col-span-5">
          <h1 className="text-2xl font-medium text-ink">{listing.title}</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star">{"★".repeat(Math.round(rating))}<span className="text-line">{"★".repeat(5 - Math.round(rating))}</span></span>
            <span className="text-link">{rating.toFixed(1)}</span>
            <span className="text-storm">· ReLoop verified</span>
          </div>
          <div className="flex items-center gap-2">
            <GradeBadge grade={listing.healthCard.verifiedCondition} showLabel />
          </div>
          <hr className="border-line" />
          <div>
            <span className="text-sm text-storm">Price: </span>
            <span className="text-xl text-priceRed">
              <span className="align-top text-sm">₹</span>
              <span className="text-3xl font-medium">{listing.price.toLocaleString("en-IN")}</span>
            </span>
            {saved > 0 && (
              <span className="ml-2 text-sm text-storm">
                M.R.P.: <span className="line-through">₹{original.toLocaleString("en-IN")}</span> · You save ₹
                {saved.toLocaleString("en-IN")}
              </span>
            )}
          </div>
          <p className="text-sm text-ink">{listing.description}</p>

          <PreventionBanner category={category} />
        </div>

        {/* Buy box */}
        <div className="lg:col-span-3">
          <div className="space-y-3 rounded border border-line p-4">
            <div className="text-2xl text-priceRed">
              <span className="align-top text-sm">₹</span>
              <span className="font-medium">{listing.price.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-sm text-storm">FREE delivery · {listing.healthCard.warranty}</p>
            <p className="text-lg font-medium text-success">In stock</p>
            <button
              onClick={addToCart}
              className="w-full rounded-full bg-amzYellow py-2 text-sm font-medium text-ink hover:bg-amzYellowDark"
            >
              Add to Cart
            </button>
            {addedToCart && (
              <p className="rounded bg-success/10 py-1 text-center text-xs font-medium text-success">
                ✓ Added to cart (no credits — you earn credits when you buy)
              </p>
            )}
            <button
              onClick={purchase}
              disabled={buying}
              className="w-full rounded-full bg-amzOrange py-2 text-sm font-medium text-ink hover:bg-amzOrangeDark disabled:opacity-50"
            >
              {buying ? "Completing purchase…" : "Buy Now"}
            </button>
            <p className="text-center text-xs text-storm">
              Earn ReLoop Credits 🌱 <span className="font-medium">after purchase</span>
            </p>
          </div>
        </div>
      </div>

      {error && <div className="mt-4"><ErrorState message={error} onRetry={purchase} /></div>}

      {/* Trust layer */}
      <div className="mt-6 max-w-2xl">
        <ProductHealthCard card={listing.healthCard} />
      </div>

      {reward && <CreditsReward result={reward} onClose={() => setReward(null)} />}
    </div>
  );
}
