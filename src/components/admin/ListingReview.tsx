"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { ListingDTO } from "@/types/dto";
import { GradeBadge } from "@/components/GradeBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/flow/States";

export function ListingReview() {
  const [listings, setListings] = useState<ListingDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    apiClient.getListings().then(setListings).catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }
  useEffect(load, []);

  async function act(id: string, status: "ACTIVE" | "INACTIVE") {
    setBusy(id);
    try {
      await apiClient.adminSetListingStatus(id, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!listings) return <LoadingState label="Loading listings…" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Listing Review Queue</h2>
        <p className="text-sm text-storm">
          Auto-generated second-life listings with their Product Health Cards — approve to keep
          live, or reject to pull from the marketplace.
        </p>
      </div>

      {listings.length === 0 && (
        <p className="rounded bg-white p-6 text-center text-storm">No active listings.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {listings.map((l) => (
          <div key={l.id} className="rounded border border-line bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <Link href={`/marketplace/${l.id}`} className="font-semibold hover:text-linkHover">
                  {l.title}
                </Link>
                <div className="mt-1 text-sm text-priceRed">₹{l.price.toLocaleString("en-IN")}</div>
              </div>
              <GradeBadge grade={l.healthCard.verifiedCondition} size="sm" />
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-storm">{l.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone="success">{Math.round(l.healthCard.confidence * 100)}% verified</Badge>
              {l.healthCard.flaws.length === 0 ? (
                <Badge tone="success">No flaws</Badge>
              ) : (
                l.healthCard.flaws.map((f, i) => (
                  <Badge key={i} tone="warn">
                    {f.severity} {f.type}
                  </Badge>
                ))
              )}
              <Badge tone="neutral">{l.healthCard.warranty}</Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" disabled={busy === l.id} onClick={() => act(l.id, "ACTIVE")}>
                Approve
              </Button>
              <Button size="sm" variant="danger" disabled={busy === l.id} onClick={() => act(l.id, "INACTIVE")}>
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
