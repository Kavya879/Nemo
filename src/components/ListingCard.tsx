"use client";

import Link from "next/link";
import { GradeBadge } from "@/components/GradeBadge";
import { ProductImage } from "@/components/ProductImage";
import { useCart, type CartLine } from "@/lib/cart";
import type { ListingDTO } from "@/types/dto";

/** Star row derived from the verified condition confidence (data-driven). */
function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating * 2) / 2;
  return (
    <span className="flex items-center gap-1">
      <span className="text-star" aria-hidden>
        {"★".repeat(Math.floor(full))}
        {full % 1 ? "½" : ""}
        <span className="text-line">{"★".repeat(5 - Math.ceil(full))}</span>
      </span>
      <span className="text-xs text-link">{rating.toFixed(1)}</span>
    </span>
  );
}

/** Build the cart line for a one-of-a-kind resold listing (maxQty is always 1). */
export function toResoldCartLine(l: ListingDTO): Omit<CartLine, "qty"> {
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

export function ListingCard({ listing }: { listing: ListingDTO }) {
  const grade = listing.healthCard.verifiedCondition;
  const rating = 3 + listing.healthCard.confidence * 2; // 3..5
  const { add, qtyOf } = useCart();
  const inCart = qtyOf(listing.id);
  const soldOut = listing.status === "SOLD";

  return (
    <div className="flex flex-col gap-2 rounded bg-white p-4 transition-shadow hover:shadow-cardHover">
      <Link href={`/marketplace/${listing.id}`} className="flex flex-col gap-2">
        <div className="relative h-40 overflow-hidden rounded">
          <ProductImage
            src={listing.photoUrl ?? listing.item?.imageUrl}
            category={listing.item?.category}
            alt={listing.title}
            className="h-full w-full"
          />
          {soldOut ? (
            <span className="absolute right-2 top-2 rounded-full bg-storm px-2 py-0.5 text-xs font-bold text-white">
              Sold Out
            </span>
          ) : (
            inCart > 0 && (
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-squid">
                🛒 {inCart} in cart
              </span>
            )
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-bold text-success">
            Certified Pre-Owned
          </span>
          <GradeBadge grade={grade} size="sm" />
        </div>
        <h3 className="line-clamp-2 text-sm text-ink hover:text-linkHover">{listing.title}</h3>
        <Stars rating={rating} />
        {listing.returnRiskLevel && (
          <span
            className={`w-fit rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              listing.returnRiskLevel === "low"
                ? "bg-success/10 text-success"
                : listing.returnRiskLevel === "medium"
                  ? "bg-warn/10 text-warn"
                  : "bg-danger/10 text-danger"
            }`}
            title="AI-assessed return risk"
          >
            {listing.returnRiskLevel === "low"
              ? "✓ Low return risk"
              : listing.returnRiskLevel === "medium"
                ? "• Medium return risk"
                : "! High return risk"}
          </span>
        )}
        <div className="flex items-baseline gap-0.5">
          <span className="text-xs text-ink">₹</span>
          <span className="text-2xl font-medium text-ink">
            {listing.price.toLocaleString("en-IN")}
          </span>
          <span className="ml-2 text-xs text-storm">
            {Math.round(listing.pricePct * 100)}% of original
          </span>
        </div>
      </Link>

      {/* Availability + add-to-cart. One-of-a-kind: a single unit only. */}
      {soldOut ? (
        <button
          disabled
          className="mt-auto w-full cursor-not-allowed rounded-full bg-mist py-1.5 text-sm font-medium text-storm"
        >
          Sold Out
        </button>
      ) : inCart > 0 ? (
        <Link
          href="/cart"
          className="mt-auto w-full rounded-full bg-success/10 py-1.5 text-center text-sm font-medium text-success"
        >
          ✓ In cart · View cart
        </Link>
      ) : (
        <button
          onClick={() => add(toResoldCartLine(listing))}
          className="mt-auto w-full rounded-full bg-amzYellow py-1.5 text-sm font-medium text-ink hover:bg-amzYellowDark"
        >
          Add to Cart
        </button>
      )}
    </div>
  );
}
