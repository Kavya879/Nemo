"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useCart, type CartLine } from "@/lib/cart";
import type { ListingDTO, ProductIntelligenceDTO } from "@/types/dto";
import { ProductHealthCard } from "@/components/ProductHealthCard";
import { ProductImage } from "@/components/ProductImage";
import { PreventionBanner } from "@/components/PreventionBanner";
import { GradeBadge } from "@/components/GradeBadge";
import { ReturnRiskPanel } from "@/components/intelligence/ReturnRiskPanel";
import { ProductPassportPanel } from "@/components/intelligence/ProductPassportPanel";
import { DigitalTwinPanel } from "@/components/intelligence/DigitalTwinPanel";
import { OwnershipFitPanel } from "@/components/intelligence/OwnershipFitPanel";
import { AlternativesStrip } from "@/components/intelligence/AlternativesStrip";
import { LoadingState, ErrorState } from "@/components/flow/States";

export function ProductDetail({ id }: { id: string }) {
  const router = useRouter();
  const { add, qtyOf } = useCart();
  const [listing, setListing] = useState<ListingDTO | null>(null);
  const [intel, setIntel] = useState<ProductIntelligenceDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  function load() {
    setError(null);
    setListing(null);
    setIntel(null);
    apiClient
      .getListing(id)
      .then(setListing)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load product"));
  }
  useEffect(load, [id]);

  // Once the listing is known, load AI intelligence and record the view (browsing history).
  useEffect(() => {
    if (!listing) return;
    apiClient.getProductIntelligence(listing.id).then(setIntel).catch(() => setIntel(null));
    apiClient.recordView(listing.itemId, listing.id).catch(() => undefined);
  }, [listing]);

  function toCartLine(l: ListingDTO): Omit<CartLine, "qty"> {
    return {
      key: l.id,
      kind: "RESOLD",
      listingId: l.id,
      itemId: l.itemId,
      title: l.title,
      price: l.price,
      category: l.item?.category ?? "general",
      originalPrice: l.item?.originalPrice ?? l.price,
      imageUrl: l.photoUrl ?? l.item?.imageUrl ?? null,
      maxQty: 1,
    };
  }

  function addToCart() {
    if (!listing) return;
    add(toCartLine(listing));
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  }

  function buyNow() {
    if (!listing) return;
    add(toCartLine(listing));
    router.push("/checkout");
  }

  if (error) return <div className="mx-auto max-w-6xl p-4"><ErrorState message={error} onRetry={load} /></div>;
  if (!listing) return <div className="mx-auto max-w-6xl p-4"><LoadingState label="Loading product…" /></div>;

  const category = listing.item?.category ?? "general";
  const original = listing.item?.originalPrice ?? Math.round(listing.price / (listing.pricePct || 1));
  const saved = Math.max(original - listing.price, 0);
  const soldOut = listing.status === "SOLD";
  // Rating is REAL — from customer reviews only (loaded with intel). Null = none.
  const avgRating = intel?.reviews.avgRating ?? null;
  const reviewCount = intel?.reviews.count ?? 0;
  // Resold listings are one-of-a-kind — exactly one unit can ever be in the cart.
  const inCart = qtyOf(listing.id) > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-3">
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
          <ProductImage
            src={listing.photoUrl ?? listing.item?.imageUrl}
            category={category}
            alt={listing.title}
            className="h-80 w-full rounded"
          />
        </div>

        {/* Center details */}
        <div className="space-y-3 lg:col-span-5">
          <h1 className="text-2xl font-medium text-ink">{listing.title}</h1>
          <div className="flex items-center gap-2 text-sm">
            {avgRating != null && reviewCount > 0 ? (
              <>
                <span className="text-star">
                  {"★".repeat(Math.round(avgRating))}
                  <span className="text-line">{"★".repeat(5 - Math.round(avgRating))}</span>
                </span>
                <span className="text-link">
                  {avgRating.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span className="text-storm">No ratings yet</span>
            )}
            <span className="text-storm">· Amazon Nemo verified</span>
          </div>
          <GradeBadge grade={listing.healthCard.verifiedCondition} showLabel />
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
          <p className="flex items-center gap-1 text-xs text-storm">
            <span>🔒</span> Sold by a verified Amazon Nemo seller — seller identity is protected.
            Condition shown is the AI-verified Product Health Card below.
          </p>
          <PreventionBanner category={category} />
          {intel && <ReturnRiskPanel risk={intel.returnRisk} />}
        </div>

        {/* Buy box */}
        <div className="lg:col-span-3">
          <div className="space-y-3 rounded border border-line p-4">
            <div className="text-2xl text-priceRed">
              <span className="align-top text-sm">₹</span>
              <span className="font-medium">{listing.price.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-sm text-storm">FREE delivery</p>
            {soldOut ? (
              <p className="text-lg font-medium text-storm">Sold Out</p>
            ) : (
              <p className="text-lg font-medium text-success">In stock · one available</p>
            )}
            {inCart ? (
              <Link
                href="/cart"
                className="block w-full rounded-full bg-success/10 py-2 text-center text-sm font-medium text-success"
              >
                ✓ In cart · View cart
              </Link>
            ) : (
              <button
                onClick={addToCart}
                disabled={soldOut}
                className="w-full rounded-full bg-amzYellow py-2 text-sm font-medium text-ink hover:bg-amzYellowDark disabled:cursor-not-allowed disabled:bg-mist disabled:text-storm"
              >
                {soldOut ? "Sold Out" : "Add to Cart"}
              </button>
            )}
            {addedToCart && !inCart && (
              <p className="rounded bg-success/10 py-1 text-center text-xs font-medium text-success">
                ✓ Added to cart ·{" "}
                <Link href="/cart" className="underline">
                  View cart
                </Link>
              </p>
            )}
            <button
              onClick={buyNow}
              disabled={soldOut}
              className="w-full rounded-full bg-amzOrange py-2 text-sm font-medium text-ink hover:bg-amzOrangeDark disabled:cursor-not-allowed disabled:bg-mist disabled:text-storm"
            >
              Buy Now
            </button>
            <p className="text-center text-xs text-storm">
              Earn Amazon Nemo Credits 🌱 <span className="font-medium">after purchase</span>
            </p>
          </div>
          {intel?.twin && (
            <div className="mt-3">
              <DigitalTwinPanel twin={intel.twin} cohort={intel.cohort} />
            </div>
          )}
        </div>
      </div>

      {/* AI Product Passport */}
      {intel && (
        <div className="mt-6">
          <ProductPassportPanel passport={intel.passport} />
        </div>
      )}

      {/* Ownership & Fit (lifespan, cost/yr, regret, compatibility) */}
      {intel && (
        <div className="mt-6">
          <OwnershipFitPanel ownership={intel.ownership} compatibility={intel.compatibility} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ProductHealthCard card={listing.healthCard} />

        {/* Intelligent review summary */}
        {intel && (
          <div className="rounded-card border border-line bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Customer reviews</h3>
              {intel.reviews.avgRating != null && (
                <span className="text-sm text-link">
                  {intel.reviews.avgRating.toFixed(1)}★ · {intel.reviews.count} review
                  {intel.reviews.count === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {intel.reviews.count === 0 ? (
              <p className="text-xs text-storm">No reviews yet for this product.</p>
            ) : (
              <div className="space-y-2">
                {intel.reviews.positive && (
                  <div className="rounded border border-success/30 bg-success/5 p-2">
                    <div className="text-xs font-semibold text-success">
                      👍 {intel.reviews.positive.title ?? `${intel.reviews.positive.rating}★`}
                    </div>
                    <p className="text-xs text-ink">{intel.reviews.positive.body}</p>
                  </div>
                )}
                {intel.reviews.critical && (
                  <div className="rounded border border-warn/30 bg-warn/5 p-2">
                    <div className="text-xs font-semibold text-warn">
                      👎 {intel.reviews.critical.title ?? `${intel.reviews.critical.rating}★`}
                    </div>
                    <p className="text-xs text-ink">{intel.reviews.critical.body}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lower-risk alternatives (lazy) */}
      <AlternativesStrip listingId={listing.id} />
    </div>
  );
}
