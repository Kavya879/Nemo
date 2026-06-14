"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { ListingDTO, ProductDTO } from "@/types/dto";
import { ListingCard } from "@/components/ListingCard";
import { ProductCard } from "@/components/ProductCard";
import { LoadingState, ErrorState } from "@/components/flow/States";

function MarketplaceInner() {
  const params = useSearchParams();
  const q = params.get("q")?.toLowerCase() ?? "";
  const [listings, setListings] = useState<ListingDTO[] | null>(null);
  const [products, setProducts] = useState<ProductDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setListings(null);
    setProducts(null);
    apiClient
      .getListings()
      .then(setListings)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load listings"));
    apiClient.getProducts().then(setProducts).catch(() => setProducts([]));
  }
  useEffect(load, []);

  // Brand-new: keep API order (in-stock first), then out-of-stock last; filter by query.
  const newFiltered = useMemo(() => {
    if (!products) return [];
    const matched = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.brand?.toLowerCase().includes(q) ?? false),
        )
      : products;
    return [...matched].sort((a, b) => (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0));
  }, [products, q]);

  // Resold: ACTIVE listings come available-first; sold listings sink to the bottom.
  const resoldFiltered = useMemo(() => {
    if (!listings) return [];
    const matched = q
      ? listings.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.item?.category?.toLowerCase().includes(q) ||
            l.item?.name?.toLowerCase().includes(q),
        )
      : listings;
    return [...matched].sort(
      (a, b) => (a.status === "SOLD" ? 1 : 0) - (b.status === "SOLD" ? 1 : 0),
    );
  }, [listings, q]);

  const total = newFiltered.length + resoldFiltered.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {error && <ErrorState message={error} onRetry={load} />}
      {!error && (!listings || !products) && <LoadingState label="Loading marketplace…" />}
      {listings && products && (
        <>
          <div className="mb-4 border-b border-line pb-2 text-sm text-ink">
            {q ? (
              <>
                <span className="text-storm">Results for </span>
                <span className="font-bold">&quot;{q}&quot;</span>
                <span className="text-storm"> — {total} item(s)</span>
              </>
            ) : (
              <>
                <span className="font-bold">{total}</span>
                <span className="text-storm"> products across Brand New &amp; Resold</span>
              </>
            )}
          </div>

          {total === 0 && (
            <p className="rounded bg-white p-8 text-center text-storm">
              No matching products.
            </p>
          )}

          {newFiltered.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-bold text-ink">Brand New Products</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {newFiltered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {resoldFiltered.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">Resold Products (AI-verified)</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {resoldFiltered.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading marketplace…" />}>
      <MarketplaceInner />
    </Suspense>
  );
}
