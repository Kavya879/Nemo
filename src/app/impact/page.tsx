"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import type { CreditTotalsDTO } from "@/types/dto";
import { PageShell } from "@/components/PageShell";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/flow/States";

export default function ImpactPage() {
  const [totals, setTotals] = useState<CreditTotalsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setTotals(null);
    apiClient
      .getCreditTotals()
      .then(setTotals)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load impact"));
  }
  useEffect(load, []);

  const stats = totals
    ? [
        { label: "ReLoop Credits", value: totals.totalCredits.toLocaleString("en-IN"), tone: "text-zest" },
        { label: "CO₂ avoided (kg)", value: totals.totalCo2SavedKg.toFixed(1), tone: "text-success" },
        { label: "Cost saved (₹)", value: totals.totalCostSaved.toLocaleString("en-IN"), tone: "text-success" },
        { label: "Second-life actions", value: String(totals.count), tone: "text-link" },
      ]
    : [];

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Your Impact Dashboard</h1>
        <p className="text-sm text-storm">
          Every reuse is CO₂ avoided, money saved, and a product kept out of landfill.
        </p>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !totals && <LoadingState label="Loading impact…" />}
      {totals && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card>
                <CardBody className="text-center">
                  <div className={`text-3xl font-bold ${s.tone}`}>{s.value}</div>
                  <div className="mt-1 text-sm text-storm">{s.label}</div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
