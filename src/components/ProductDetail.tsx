"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useCart, type CartLine } from "@/lib/cart";
import type { ListingDTO } from "@/types/dto";
import { ProductHealthCard } from "@/components/ProductHealthCard";
import { ProductImage } from "@/components/ProductImage";
import { PreventionBanner } from "@/components/PreventionBanner";
import { GradeBadge } from "@/components/GradeBadge";
import { LoadingState, ErrorState } from "@/components/flow/States";

export function ProductDetail({ id }: { id: string }) {
  const router = useRouter();
  const { add } = useCart();
  const [listing, setListing] = useState<ListingDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  function load() {
    setError(null);
    setListing(null);
    apiClient
      .getListing(id)
      .then(setListing)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load product"));
  }
  useEffect(load, [id]);

  function toCartLine(l: ListingDTO): Omit<CartLine, "qty"> {
    return {
      listingId: l.id,
      itemId: l.itemId,
      title: l.title,
      price: l.price,
      category: l.item?.category ?? "general",
      originalPrice: l.item?.originalPrice ?? l.price,
      imageUrl: l.item?.imageUrl ?? null,
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
  const rating = 3 + listing.healthCard.confidence * 2;

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
            src={listing.item?.imageUrl}
            category={category}
            alt={listing.title}
            className="h-80 w-full rounded"
          />
        </div>

        {/* Center details */}
        <div className="space-y-3 lg:col-span-5">
          <h1 className="text-2xl font-medium text-ink">{listing.title}</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star">{"★".repeat(Math.round(rating))}<span className="text-line">{"★".repeat(5 - Math.round(rating))}</span></span>
            <span className="text-link">{rating.toFixed(1)}</span>
            <span className="text-storm">· ReLoop verified</span>
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
            <span>🔒</span> Sold by a verified ReLoop seller — seller identity is protected.
            Condition shown is the AI-verified Product Health Card below.
          </p>
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
                ✓ Added to cart ·{" "}
                <Link href="/cart" className="underline">
                  View cart
                </Link>
              </p>
            )}
            <button
              onClick={buyNow}
              className="w-full rounded-full bg-amzOrange py-2 text-sm font-medium text-ink hover:bg-amzOrangeDark"
            >
              Buy Now
            </button>
            <p className="text-center text-xs text-storm">
              Earn ReLoop Credits 🌱 <span className="font-medium">after purchase</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-2xl">
        <ProductHealthCard card={listing.healthCard} />
      </div>
    </div>
  );
}
