"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { ProductDTO } from "@/types/dto";
import { ProductCard } from "@/components/ProductCard";
import { LoadingState, ErrorState } from "@/components/flow/States";

/**
 * Brand New store — standard Amazon-style catalog (own route, separate from the
 * second-life /marketplace). In-stock products first; out-of-stock sink last.
 */
function ProductsInner() {
  const params = useSearchParams();
  const q = params.get("q")?.toLowerCase() ?? "";
  const [products, setProducts] = useState<ProductDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setProducts(null);
    apiClient
      .getProducts()
      .then(setProducts)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load products"));
  }
  useEffect(load, []);

  const filtered = useMemo(() => {
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !products && <LoadingState label="Loading Brand New store…" />}
      {products && (
        <>
          <div className="mb-4 border-b border-line pb-2 text-sm text-ink">
            {q ? (
              <>
                <span className="text-storm">Results for </span>
                <span className="font-bold">&quot;{q}&quot;</span>
                <span className="text-storm"> — {filtered.length} item(s)</span>
              </>
            ) : (
              <>
                <span className="font-bold">{filtered.length}</span>
                <span className="text-storm"> Brand New products</span>
              </>
            )}
          </div>
          {filtered.length === 0 ? (
            <p className="rounded bg-white p-8 text-center text-storm">No matching products.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading Brand New store…" />}>
      <ProductsInner />
    </Suspense>
  );
}
