"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { ListingDTO } from "@/types/dto";
import { ListingCard } from "@/components/ListingCard";
import { LoadingState, ErrorState } from "@/components/flow/States";

function MarketplaceInner() {
  const params = useSearchParams();
  const q = params.get("q")?.toLowerCase() ?? "";
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
    if (!q) return listings;
    return listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.item?.category?.toLowerCase().includes(q) ||
        l.item?.name?.toLowerCase().includes(q),
    );
  }, [listings, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !listings && <LoadingState label="Loading marketplace…" />}
      {listings && (
        <>
          <div className="mb-3 border-b border-line pb-2 text-sm text-ink">
            {q ? (
              <>
                <span className="text-storm">Results for </span>
                <span className="font-bold">&quot;{q}&quot;</span>
                <span className="text-storm"> — {filtered.length} item(s)</span>
              </>
            ) : (
              <>
                <span className="font-bold">{filtered.length}</span>
                <span className="text-storm"> results in Second-Life Marketplace</span>
              </>
            )}
          </div>
          {filtered.length === 0 ? (
            <p className="rounded bg-white p-8 text-center text-storm">
              No matching listings. Run a return through the spine to create one.
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
