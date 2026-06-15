"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { ListingDTO } from "@/types/dto";
import { ListingCard } from "@/components/ListingCard";
import { LoadingState, ErrorState } from "@/components/flow/States";

/**
 * Second-Life Marketplace — RESOLD products only (own route, separate from the
 * Brand New store at /products). Available listings first; sold ones sink last.
 */
function MarketplaceInner() {
  const params = useSearchParams();
  const q = params?.get("q")?.toLowerCase() ?? "";
  const [listings, setListings] = useState<ListingDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setListings(null);
    apiClient
      .getListings()
      .then(setListings)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load listings"));
  }
  useEffect(load, []);

  const filtered = useMemo(() => {
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !listings && <LoadingState label="Loading second-life marketplace…" />}
      {listings && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-sm text-ink">
            <div>
              {q ? (
                <>
                  <span className="text-storm">Results for </span>
                  <span className="font-bold">&quot;{q}&quot;</span>
                  <span className="text-storm"> — {filtered.length} resold item(s)</span>
                </>
              ) : (
                <>
                  <span className="font-bold">{filtered.length}</span>
                  <span className="text-storm"> AI-verified second-life products</span>
                </>
              )}
            </div>
            <Link href="/products" className="text-link hover:text-linkHover hover:underline">
              Shop Brand New instead →
            </Link>
          </div>
          {filtered.length === 0 ? (
            <p className="rounded bg-white p-8 text-center text-storm">
              No matching second-life listings.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
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
