"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CreditTotalsDTO, RewardDTO } from "@/types/dto";
import { LoadingState, ErrorState } from "@/components/flow/States";

export default function ImpactPage() {
  const [totals, setTotals] = useState<CreditTotalsDTO | null>(null);
  const [rewards, setRewards] = useState<RewardDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    setError(null);
    setTotals(null);
    Promise.all([apiClient.getCreditTotals(), apiClient.getRewards()])
      .then(([t, r]) => {
        setTotals(t);
        setRewards(r);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load impact"));
  }
  useEffect(load, []);

  async function redeem(reward: RewardDTO) {
    setRedeeming(reward.id);
    setError(null);
    try {
      const res = await apiClient.redeem(reward.id);
      setTotals(res.totals);
      setToast(
        `${reward.icon} ${reward.label} redeemed · code ${res.redemption.code} — see Redeemed Coupons`,
      );
      setTimeout(() => setToast(null), 5000);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not redeem";
      setError(msg);
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold">Your Impact &amp; ReLoop Credits</h1>
      <p className="text-sm text-storm">
        Every reuse is CO₂ avoided and money saved. Spend your credits on rewards below.
      </p>

      {error && <div className="mt-4"><ErrorState message={error} onRetry={load} /></div>}
      {!error && !totals && <div className="mt-6"><LoadingState label="Loading impact…" /></div>}

      {totals && (
        <>
          {/* Balance hero */}
          <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded bg-squid p-6 text-white sm:flex-row sm:items-center">
            <div>
              <div className="text-sm text-mist/70">Available ReLoop Credits</div>
              <div className="text-5xl font-bold text-zest">{totals.availableBalance}</div>
              <div className="mt-1 text-xs text-mist/70">
                {totals.totalCredits} earned · {totals.totalRedeemed} redeemed
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-success">
                  {totals.totalCo2SavedKg.toFixed(1)}
                </div>
                <div className="text-xs text-mist/70">kg CO₂ avoided</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  ₹{totals.totalCostSaved.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-mist/70">cost saved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-zest">{totals.count}</div>
                <div className="text-xs text-mist/70">second-life actions</div>
              </div>
            </div>
          </div>

          {/* Reward catalog */}
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-xl font-bold">Redeem your credits</h2>
            <a href="/coupons" className="text-sm font-medium text-link hover:text-linkHover hover:underline">
              View Redeemed Coupons →
            </a>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rewards.map((r) => {
              const affordable = totals.availableBalance >= r.cost;
              return (
                <div key={r.id} className="flex flex-col rounded bg-white p-4 shadow-card">
                  <div className="mb-2 text-4xl">{r.icon}</div>
                  <h3 className="font-bold text-ink">{r.label}</h3>
                  <p className="mt-1 flex-1 text-xs text-storm">{r.description}</p>
                  <div className="mt-3 text-sm font-bold text-priceRed">{r.cost} credits</div>
                  <button
                    onClick={() => redeem(r)}
                    disabled={!affordable || redeeming === r.id}
                    className="mt-2 w-full rounded-full bg-amzYellow py-2 text-sm font-medium text-ink hover:bg-amzYellowDark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {redeeming === r.id ? "Redeeming…" : affordable ? "Redeem" : "Not enough credits"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-success px-5 py-3 text-sm font-medium text-white shadow-cardHover"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
