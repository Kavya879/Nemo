"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { useCart, type CartLine } from "@/lib/cart";
import type { ProductDTO } from "@/types/dto";

/** Build the cart line for a brand-new product (maxQty mirrors live stock). */
export function toNewCartLine(p: ProductDTO): Omit<CartLine, "qty"> {
  return {
    key: p.id,
    kind: "NEW",
    productId: p.id,
    title: p.name,
    price: p.price,
    category: p.category,
    originalPrice: p.price,
    imageUrl: p.imageUrl,
    maxQty: p.stock,
  };
}

/** Coloured stock pill driven purely by real stock (single source of truth). */
export function StockBadge({ status, label }: { status: ProductDTO["stockStatus"]; label: string }) {
  const cls =
    status === "OUT_OF_STOCK"
      ? "bg-storm/15 text-storm"
      : status === "LOW_STOCK"
        ? "bg-warn/15 text-warn"
        : "bg-success/15 text-success";
  return <span className={`w-fit rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}

export function ProductCard({ product }: { product: ProductDTO }) {
  const { add, setQty, qtyOf } = useCart();
  const inCart = qtyOf(product.id);
  const outOfStock = product.stock <= 0;
  const atMax = inCart >= product.stock;

  return (
    <div className="flex flex-col gap-2 rounded bg-white p-4 transition-shadow hover:shadow-cardHover">
      <Link href={`/products/${product.id}`} className="flex flex-col gap-2">
        <div className="relative h-40 overflow-hidden rounded">
          <ProductImage
            src={product.imageUrl}
            category={product.category}
            alt={product.name}
            className="h-full w-full"
          />
          {inCart > 0 && !outOfStock && (
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-squid">
              🛒 {inCart} in cart
            </span>
          )}
        </div>
        <span className="w-fit rounded bg-link/10 px-1.5 py-0.5 text-[11px] font-bold text-link">
          Brand New
        </span>
        <h3 className="line-clamp-2 text-sm text-ink hover:text-linkHover">{product.name}</h3>
        <StockBadge status={product.stockStatus} label={product.stockLabel} />
        <div className="flex items-baseline gap-0.5">
          <span className="text-xs text-ink">₹</span>
          <span className="text-2xl font-medium text-ink">{product.price.toLocaleString("en-IN")}</span>
        </div>
      </Link>

      {/* Availability-bounded add-to-cart + quantity controls. */}
      {outOfStock ? (
        <button
          disabled
          className="mt-auto w-full cursor-not-allowed rounded-full bg-mist py-1.5 text-sm font-medium text-storm"
        >
          Out of Stock
        </button>
      ) : inCart === 0 ? (
        <button
          onClick={() => add(toNewCartLine(product))}
          className="mt-auto w-full rounded-full bg-amzYellow py-1.5 text-sm font-medium text-ink hover:bg-amzYellowDark"
        >
          Add to Cart
        </button>
      ) : (
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center overflow-hidden rounded-full border border-line">
            <button
              aria-label="Decrease quantity"
              onClick={() => setQty(product.id, inCart - 1)}
              className="h-8 w-8 bg-mist/60 text-lg font-bold hover:bg-mist"
            >
              {inCart <= 1 ? "🗑" : "−"}
            </button>
            <span className="w-9 text-center text-sm font-semibold">{inCart}</span>
            <button
              aria-label="Increase quantity"
              disabled={atMax}
              onClick={() => add(toNewCartLine(product))}
              className="h-8 w-8 bg-mist/60 text-lg font-bold hover:bg-mist disabled:cursor-not-allowed disabled:text-line"
            >
              +
            </button>
          </div>
          <span className="text-[11px] text-storm">
            {atMax ? "Max reached" : `${product.stock - inCart} more`}
          </span>
        </div>
      )}
    </div>
  );
}
