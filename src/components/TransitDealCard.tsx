"use client";

import { useRouter } from "next/navigation";
import { ProductImage } from "@/components/ProductImage";
import { useCart, type CartLine } from "@/lib/cart";
import type { ReturnDealDTO } from "@/types/dto";

/**
 * A Return-in-Transit deal card. Shows the dynamically-computed discount, the
 * original vs discounted price, the estimated arrival date, and a status badge.
 * The item is one-of-a-kind (still in the return pipeline), so it's a single
 * "reserve" purchase — added to the cart with maxQty 1.
 */

const BADGE_CLS: Record<ReturnDealDTO["badge"], string> = {
  "Smart Deal": "bg-success/15 text-success",
  "Arriving Soon": "bg-warn/15 text-warn",
  "In Return Pipeline": "bg-link/10 text-link",
};

function toTransitCartLine(d: ReturnDealDTO): Omit<CartLine, "qty"> {
  return {
    key: d.returnCaseId,
    kind: "TRANSIT",
    returnCaseId: d.returnCaseId,
    itemId: d.itemId,
    title: d.name,
    price: d.discountedPrice,
    category: d.category,
    originalPrice: d.originalPrice,
    imageUrl: d.imageUrl,
    maxQty: 1,
  };
}

export function TransitDealCard({ deal }: { deal: ReturnDealDTO }) {
  const router = useRouter();
  const { add, qtyOf } = useCart();
  const inCart = qtyOf(deal.returnCaseId) > 0;
  const arrival = new Date(deal.estimatedArrival).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const pctOff = Math.round(deal.discountPct * 100);

  function reserve(buyNow: boolean) {
    if (!inCart) add(toTransitCartLine(deal));
    if (buyNow) router.push("/checkout");
  }

  return (
    <div className="flex flex-col gap-2 rounded bg-white p-4 transition-shadow hover:shadow-cardHover">
      <div className="relative h-40 overflow-hidden rounded">
        <ProductImage src={deal.imageUrl} category={deal.category} alt={deal.name} className="h-full w-full" />
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE_CLS[deal.badge]}`}>
          {deal.badge}
        </span>
        {pctOff > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-priceRed px-2 py-0.5 text-[11px] font-bold text-white">
            -{pctOff}%
          </span>
        )}
      </div>

      <span className="w-fit rounded bg-link/10 px-1.5 py-0.5 text-[11px] font-bold text-link">
        🚚 In Return Pipeline
      </span>
      <h3 className="line-clamp-2 text-sm text-ink">{deal.name}</h3>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-medium text-priceRed">
          ₹{deal.discountedPrice.toLocaleString("en-IN")}
        </span>
        {pctOff > 0 && (
          <span className="text-xs text-storm line-through">
            ₹{deal.originalPrice.toLocaleString("en-IN")}
          </span>
        )}
      </div>

      <p className="text-xs text-storm">
        Est. arrival <span className="font-medium text-ink">{arrival}</span> ·{" "}
        {deal.daysInPipeline} day{deal.daysInPipeline === 1 ? "" : "s"} in pipeline
        {pctOff === 0 && " · discount grows daily"}
      </p>

      {inCart ? (
        <button
          onClick={() => router.push("/cart")}
          className="mt-auto w-full rounded-full bg-success/10 py-1.5 text-sm font-medium text-success"
        >
          ✓ Reserved in cart · View cart
        </button>
      ) : (
        <div className="mt-auto grid grid-cols-2 gap-2">
          <button
            onClick={() => reserve(false)}
            className="rounded-full bg-amzYellow py-1.5 text-sm font-medium text-ink hover:bg-amzYellowDark"
          >
            Reserve
          </button>
          <button
            onClick={() => reserve(true)}
            className="rounded-full bg-amzOrange py-1.5 text-sm font-medium text-ink hover:bg-amzOrangeDark"
          >
            Buy Now
          </button>
        </div>
      )}
    </div>
  );
}
