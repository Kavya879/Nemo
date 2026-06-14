"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { AlternativeItemDTO } from "@/types/dto";

/**
 * Lower-return-risk alternatives in the same category — lazy-loaded so it never
 * blocks the main product intelligence. Lets the shopper swap a risky pick for a
 * safer one before buying.
 */
export function AlternativesStrip({ listingId }: { listingId: string }) {
  const [alts, setAlts] = useState<AlternativeItemDTO[] | null>(null);

  useEffect(() => {
    apiClient.getAlternatives(listingId).then(setAlts).catch(() => setAlts([]));
  }, [listingId]);

  if (!alts || alts.length === 0) return null;

  return (
    <div className="mt-6 rounded-card border border-line bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-ink">Lower-risk alternatives</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {alts.map((a) => (
          <Link
            key={a.listingId}
            href={`/marketplace/${a.listingId}`}
            className="w-44 shrink-0 rounded border border-line p-3 hover:shadow-cardHover"
          >
            <div className="line-clamp-2 text-xs font-medium text-ink">{a.title}</div>
            <div className="mt-1 font-bold text-priceRed">₹{a.price.toLocaleString("en-IN")}</div>
            <span
              className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                a.riskLevel === "low"
                  ? "bg-success/10 text-success"
                  : a.riskLevel === "medium"
                    ? "bg-warn/10 text-warn"
                    : "bg-danger/10 text-danger"
              }`}
            >
              {a.reason}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
