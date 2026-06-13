"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { PreventionResultDTO } from "@/types/dto";

/**
 * Return Prevention banner — shown on a product page BEFORE purchase.
 * "The best return is no return." Fetches personalized guidance from the API.
 */
export function PreventionBanner({
  category,
  profile,
}: {
  category: string;
  profile?: Record<string, string>;
}) {
  const [data, setData] = useState<PreventionResultDTO | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiClient
      .prevention(category, profile)
      .then(setData)
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  if (failed || !data) return null;

  return (
    <div className="flex items-start gap-3 rounded-card border border-link/30 bg-link/5 p-4">
      <span className="mt-0.5 text-xl">💡</span>
      <div>
        <p className="text-sm font-semibold text-link">
          Before you buy — the best return is no return
        </p>
        <p className="mt-1 text-sm text-ink">{data.message}</p>
        {data.topReason && (
          <p className="mt-1 text-xs text-storm">
            Based on {data.sampleSize} past return{data.sampleSize === 1 ? "" : "s"} ·{" "}
            {Math.round(data.confidence * 100)}% confidence
          </p>
        )}
      </div>
    </div>
  );
}
