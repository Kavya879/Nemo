"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useCart } from "@/lib/cart";
import type { ProductDTO } from "@/types/dto";
import { ProductImage } from "@/components/ProductImage";
import { StockBadge, toNewCartLine } from "@/components/ProductCard";
import { PreventionBanner } from "@/components/PreventionBanner";
import { LoadingState, ErrorState } from "@/components/flow/States";

/**
 * Brand-new product page — standard Amazon-style buy box with live, DB-backed
 * stock. No AI grade / health card (those belong to the resold ecosystem); every
 * value here comes straight from the Product record.
 */
export function BrandNewDetail({ id }: { id: string }) {
  const router = useRouter();
  const { add, setQty, qtyOf } = useCart();
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  function load() {
    setError(null);
    setProduct(null);
    apiClient
      .getProduct(id)
      .then(setProduct)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load product"));
  }
  useEffect(load, [id]);

  if (error) return <div className="mx-auto max-w-6xl p-4"><ErrorState message={error} onRetry={load} /></div>;
  if (!product) return <div className="mx-auto max-w-6xl p-4"><LoadingState label="Loading product…" /></div>;

  const inCart = qtyOf(product.id);
  const outOfStock = product.stock <= 0;
  const atMax = inCart >= product.stock;

  function addToCart() {
    if (!product || outOfStock) return;
    add(toNewCartLine(product));
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  }
  function buyNow() {
    if (!product || outOfStock) return;
    if (inCart === 0) add(toNewCartLine(product));
    router.push("/checkout");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-3">
      <nav className="mb-3 text-xs text-link">
        <Link href="/marketplace" className="hover:text-linkHover hover:underline">Shop</Link>
        <span className="mx-1 text-storm">›</span>
        <Link href={`/marketplace?q=${encodeURIComponent(product.category)}`} className="hover:text-linkHover hover:underline">
          {product.category}
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-6 rounded bg-white p-5 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <ProductImage src={product.imageUrl} category={product.category} alt={product.name} className="h-80 w-full rounded" />
        </div>

        <div className="space-y-3 lg:col-span-5">
          <h1 className="text-2xl font-medium text-ink">{product.name}</h1>
          <span className="inline-block w-fit rounded bg-link/10 px-1.5 py-0.5 text-[11px] font-bold text-link">
            Brand New {product.brand ? `· ${product.brand}` : ""}
          </span>
          <hr className="border-line" />
          <div>
            <span className="text-sm text-storm">Price: </span>
            <span className="text-xl text-priceRed">
              <span className="align-top text-sm">₹</span>
              <span className="text-3xl font-medium">{product.price.toLocaleString("en-IN")}</span>
            </span>
          </div>
          <p className="text-sm text-ink">{product.description}</p>
          <PreventionBanner category={product.category} />
        </div>

        {/* Buy box */}
        <div className="lg:col-span-3">
          <div className="space-y-3 rounded border border-line p-4">
            <div className="text-2xl text-priceRed">
              <span className="align-top text-sm">₹</span>
              <span className="font-medium">{product.price.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-sm text-storm">FREE delivery</p>
            <StockBadge status={product.stockStatus} label={product.stockLabel} />

            {outOfStock ? (
              <button disabled className="w-full cursor-not-allowed rounded-full bg-mist py-2 text-sm font-medium text-storm">
                Out of Stock
              </button>
            ) : inCart === 0 ? (
              <button
                onClick={addToCart}
                className="w-full rounded-full bg-amzYellow py-2 text-sm font-medium text-ink hover:bg-amzYellowDark"
              >
                Add to Cart
              </button>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center overflow-hidden rounded-full border border-line">
                  <button
                    aria-label="Decrease quantity"
                    onClick={() => setQty(product.id, inCart - 1)}
                    className="h-9 w-9 bg-mist/60 text-lg font-bold hover:bg-mist"
                  >
                    {inCart <= 1 ? "🗑" : "−"}
                  </button>
                  <span className="w-10 text-center text-sm font-semibold">{inCart}</span>
                  <button
                    aria-label="Increase quantity"
                    disabled={atMax}
                    onClick={addToCart}
                    className="h-9 w-9 bg-mist/60 text-lg font-bold hover:bg-mist disabled:cursor-not-allowed disabled:text-line"
                  >
                    +
                  </button>
                </div>
                <Link href="/cart" className="text-xs font-medium text-link underline">View cart</Link>
              </div>
            )}
            {atMax && !outOfStock && inCart > 0 && (
              <p className="text-center text-xs text-warn">Maximum available quantity reached</p>
            )}
            {addedToCart && (
              <p className="rounded bg-success/10 py-1 text-center text-xs font-medium text-success">
                ✓ Added to cart
              </p>
            )}
            <button
              onClick={buyNow}
              disabled={outOfStock}
              className="w-full rounded-full bg-amzOrange py-2 text-sm font-medium text-ink hover:bg-amzOrangeDark disabled:cursor-not-allowed disabled:bg-mist disabled:text-storm"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
