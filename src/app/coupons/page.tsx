"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { RedemptionDTO } from "@/types/dto";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/flow/States";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<RedemptionDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function load() {
    setError(null);
    setCoupons(null);
    apiClient
      .getRedemptions()
      .then(setCoupons)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load coupons"));
  }
  useEffect(load, []);

  function copy(code: string) {
    navigator.clipboard?.writeText(code).catch(() => undefined);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold">Redeemed Coupons</h1>
      <p className="text-sm text-storm">Your redeemed rewards, codes, and where to use them.</p>

      {error && <div className="mt-4"><ErrorState message={error} onRetry={load} /></div>}
      {!error && !coupons && <div className="mt-6"><LoadingState label="Loading coupons…" /></div>}

      {coupons && coupons.length === 0 && (
        <div className="mt-6 rounded bg-white p-8 text-center text-storm">
          No coupons yet.{" "}
          <Link href="/impact" className="font-medium text-link hover:underline">
            Redeem your ReLoop Credits
          </Link>{" "}
          to get started.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {coupons?.map((c) => {
          const external = c.redeemUrl.startsWith("http");
          return (
            <div key={c.id} className="rounded border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-ink">{c.rewardLabel}</h3>
                    <Badge tone="info">{c.kind}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-storm">{c.description}</p>
                  <p className="mt-1 text-xs text-storm">
                    Redeemed {new Date(c.createdAt).toLocaleDateString("en-IN")} · {c.cost} credits
                  </p>
                </div>

                {/* Coupon code */}
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-storm">Coupon code</div>
                  <button
                    onClick={() => copy(c.code)}
                    title="Click to copy"
                    className="mt-1 rounded border border-dashed border-ink/40 bg-cloud px-3 py-1 font-mono text-lg font-bold tracking-widest text-ink hover:bg-mist"
                  >
                    {c.code}
                  </button>
                  <div className="mt-1 h-4 text-xs text-success">
                    {copied === c.code ? "Copied!" : ""}
                  </div>
                </div>
              </div>

              {/* Where to redeem */}
              <div className="mt-3 border-t border-line pt-3 text-sm">
                <span className="text-storm">Redeem at: </span>
                {external ? (
                  <a
                    href={c.redeemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-link hover:text-linkHover hover:underline"
                  >
                    {c.redeemAt} ↗
                  </a>
                ) : (
                  <Link
                    href={c.redeemUrl}
                    className="font-medium text-link hover:text-linkHover hover:underline"
                  >
                    {c.redeemAt} →
                  </Link>
                )}
                <span className="ml-1 text-storm">({c.redeemUrl})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
