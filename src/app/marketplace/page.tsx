"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { ListingDTO } from "@/types/dto";
import { PageShell } from "@/components/PageShell";
import { ListingCard } from "@/components/ListingCard";
import { LoadingState, ErrorState } from "@/components/flow/States";

export default function MarketplacePage() {
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

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Second-Life Marketplace</h1>
        <p className="text-sm text-storm">
          Certified pre-owned, each with a verified Product Health Card. Buy with confidence.
        </p>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !listings && <LoadingState label="Loading marketplace…" />}
      {listings && listings.length === 0 && (
        <p className="rounded-card border border-line bg-white p-8 text-center text-storm">
          No listings yet. Run a return through the spine to create one.
        </p>
      )}
      {listings && listings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
