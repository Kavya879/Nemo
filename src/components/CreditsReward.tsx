"use client";

import { motion } from "framer-motion";
import type { CreditsResultDTO } from "@/types/dto";
import { Button } from "@/components/ui/Button";

/**
 * The Green Credits reward animation — fires after a second-life action.
 * "You saved 4.2kg CO₂ and ₹120 · +50 Amazon Nemo Credits"
 */
export function CreditsReward({
  result,
  onClose,
}: {
  result: CreditsResultDTO;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="w-full max-w-md rounded-card bg-white p-8 text-center shadow-cardHover"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-4xl"
        >
          🌱
        </motion.div>
        <h3 className="text-xl font-bold text-ink">Second life unlocked!</h3>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="my-4 text-4xl font-bold text-zest"
        >
          +{result.credits} Credits
        </motion.div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-cloud p-3">
            <div className="font-bold text-success">{result.co2SavedKg} kg</div>
            <div className="text-storm">CO₂ avoided</div>
          </div>
          <div className="rounded-lg bg-cloud p-3">
            <div className="font-bold text-success">
              ₹{result.costSaved.toLocaleString("en-IN")}
            </div>
            <div className="text-storm">cost saved</div>
          </div>
        </div>
        <p className="mt-4 text-xs text-storm">
          Running total: {result.totals.totalCredits} credits ·{" "}
          {result.totals.totalCo2SavedKg.toFixed(1)} kg CO₂ saved
        </p>
        <Button className="mt-5 w-full" onClick={onClose}>
          Done
        </Button>
      </motion.div>
    </div>
  );
}
