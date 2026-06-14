"use client";

import Link from "next/link";
import { GradeBadge } from "@/components/GradeBadge";
import { ProductImage } from "@/components/ProductImage";
import { useCart } from "@/lib/cart";
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

export function ListingCard({ listing }: { listing: ListingDTO }) {
  const grade = listing.healthCard.verifiedCondition;
  const rating = 3 + listing.healthCard.confidence * 2; // 3..5
  const { lines } = useCart();
  const inCart = lines.find((l) => l.listingId === listing.id)?.qty ?? 0;
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="flex flex-col gap-2 rounded bg-white p-4 transition-shadow hover:shadow-cardHover"
    >
      <div className="relative h-40 overflow-hidden rounded">
        <ProductImage
          src={listing.item?.imageUrl}
          category={listing.item?.category}
          alt={listing.title}
          className="h-full w-full"
        />
        {inCart > 0 && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-squid">
            🛒 {inCart} in cart
          </span>
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
      <p className="text-xs text-storm">
        FREE delivery · Amazon Nemo {listing.healthCard.warranty}
      </p>
    </Link>
  );
}
