"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import type { AdminAnalyticsDTO } from "@/types/dto";
import { LoadingState, ErrorState } from "@/components/flow/States";

export function Analytics() {
  const [a, setA] = useState<AdminAnalyticsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient.adminAnalytics().then(setA).catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!a) return <LoadingState label="Loading analytics…" />;

  const stats = [
    { label: "Total returns", value: a.totalReturns.toLocaleString("en-IN"), tone: "text-ink" },
    { label: "Diverted from landfill", value: a.divertedFromLandfill.toLocaleString("en-IN"), tone: "text-success" },
    { label: "CO₂ avoided (kg)", value: a.co2SavedKg.toLocaleString("en-IN"), tone: "text-success" },
    { label: "Cost saved (₹)", value: a.costSaved.toLocaleString("en-IN"), tone: "text-success" },
    { label: "Credits issued", value: a.creditsIssued.toLocaleString("en-IN"), tone: "text-zest" },
    { label: "Avg grading time", value: `${(a.avgGradingMs / 1000).toFixed(2)}s`, tone: a.avgGradingMs < 2000 ? "text-success" : "text-warn" },
  ];
  const maxCount = Math.max(...a.pathBreakdown.map((p) => p.count), 1);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Impact &amp; Operations Analytics</h2>
        <p className="text-sm text-storm">The scaled story across every return processed.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded border border-line bg-white p-3 text-center"
          >
            <div className={`text-2xl font-bold ${s.tone}`}>{s.value}</div>
            <div className="mt-1 text-xs text-storm">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="rounded border border-line bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-bold">Routing path breakdown</h3>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
            {Math.round(a.underTwoSecPct * 100)}% graded under 2s
          </span>
        </div>
        <div className="space-y-2">
          {a.pathBreakdown.map((p) => (
            <div key={p.label} className="flex items-center gap-2">
              <span className="w-40 shrink-0 text-sm text-storm">{p.label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-mist">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(p.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded bg-link"
                />
              </div>
              <span className="w-8 text-right text-sm font-semibold">{p.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
