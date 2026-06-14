"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import type { AdminCaseRowDTO } from "@/types/dto";
import { GradeBadge } from "@/components/GradeBadge";
import { ProductImage } from "@/components/ProductImage";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/flow/States";
import { DecisionExplorer } from "./DecisionExplorer";

function statusTone(s: string): "success" | "info" | "warn" | "danger" | "neutral" {
  if (["COMPLETED", "RETURNED_TO_SELLER", "TRANSFER_APPROVED"].includes(s)) return "success";
  if (["TRANSFER_REJECTED", "DISCARDED"].includes(s)) return "danger";
  if (["DONATION_PENDING", "WINDOW_EXPIRED"].includes(s)) return "warn";
  if (["INITIATED", "GRADED", "FEASIBILITY_ANALYZED"].includes(s)) return "neutral";
  return "info";
}

export function CommandCenter() {
  const [rows, setRows] = useState<AdminCaseRowDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  function load() {
    apiClient
      .adminCases()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load returns"));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // live refresh
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Live Returns Command Center</h2>
          <p className="text-sm text-storm">
            Every incoming return — auto-graded, auto-priced, auto-routed. Click a row for the full decision.
          </p>
        </div>
        {rows && (
          <Badge tone="info">
            <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-link" />
            {rows.length} returns · live
          </Badge>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !rows && <LoadingState label="Loading returns queue…" />}

      {rows && (
        <div className="overflow-x-auto rounded border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-mist/50 text-xs uppercase text-storm">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3">AI Grade</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">Chosen path</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Net recovery</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial>
                {rows.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.5) }}
                    onClick={() => setSelected(r.id)}
                    className="cursor-pointer border-b border-line/60 hover:bg-zest/10"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <ProductImage
                          src={r.imageUrl}
                          category={r.category}
                          alt={r.itemName}
                          className="h-9 w-9 shrink-0 rounded"
                        />
                        <div>
                          <div className="font-medium text-ink">{r.itemName}</div>
                          <div className="text-xs text-storm">{r.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{r.grade ? <GradeBadge grade={r.grade} size="sm" /> : "—"}</td>
                    <td className="p-3">{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"}</td>
                    <td className="p-3 font-medium">{r.pathLabel}</td>
                    <td className="p-3">
                      <Badge tone={statusTone(r.status)}>{r.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      {r.netRecoveryValue != null ? (
                        <span className={r.netRecoveryValue >= 0 ? "text-success" : "text-danger"}>
                          ₹{r.netRecoveryValue.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {selected && <DecisionExplorer id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
