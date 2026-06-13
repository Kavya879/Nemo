"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { CreditsResultDTO, ListingDTO } from "@/types/dto";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProductHealthCard } from "@/components/ProductHealthCard";
import { PreventionBanner } from "@/components/PreventionBanner";
import { CreditsReward } from "@/components/CreditsReward";
import { LoadingState, ErrorState } from "@/components/flow/States";

/** Marketplace product page — trust layer + prevention + second-life action. */
export function ProductDetail({ id }: { id: string }) {
  const [listing, setListing] = useState<ListingDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [reward, setReward] = useState<CreditsResultDTO | null>(null);

  function load() {
    setError(null);
    setListing(null);
    apiClient
      .getListing(id)
      .then(setListing)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load product"));
  }
  useEffect(load, [id]);

  async function claim() {
    if (!listing?.item) return;
    setClaiming(true);
    setError(null);
    try {
      const result = await apiClient.awardCredits({
        action: "RESELL_AS_IS",
        category: listing.item.category,
        originalPrice: listing.item.originalPrice,
        itemId: listing.itemId,
      });
      setReward(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete the action");
    } finally {
      setClaiming(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!listing) return <LoadingState label="Loading product…" />;

  const category = listing.item?.category ?? "general";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex h-72 items-center justify-center rounded-t-card bg-mist text-7xl">
            {category === "Footwear" ? "👟" : category === "Electronics" ? "🎧" : category === "Apparel" ? "🧥" : "📦"}
          </div>
        </Card>

        <div className="space-y-4">
          <Badge tone="success">Certified Pre-Owned</Badge>
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          <p className="text-sm text-storm">{listing.description}</p>
          <div className="text-3xl font-bold text-ink">
            ₹{listing.price.toLocaleString("en-IN")}
          </div>

          <PreventionBanner category={category} />

          <Button size="lg" className="w-full" onClick={claim} disabled={claiming}>
            {claiming ? "Processing…" : "Give it a second life →"}
          </Button>
        </div>
      </div>

      <ProductHealthCard card={listing.healthCard} />

      {reward && <CreditsReward result={reward} onClose={() => setReward(null)} />}
    </div>
  );
}
