"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useNotifications } from "@/lib/notifications";
import { LoadingState } from "@/components/flow/States";

const LEVEL_CLS: Record<"info" | "success" | "warning", string> = {
  success: "border-success/30 bg-success/5",
  warning: "border-warn/30 bg-warn/5",
  info: "border-line bg-white",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationsPage() {
  const { items, loading, markAllRead, refresh } = useNotifications();

  // Opening the page marks everything as read (clears the bell badge).
  useEffect(() => {
    refresh();
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={refresh} className="text-sm font-medium text-link hover:underline">
          Refresh
        </button>
      </div>

      {loading && items.length === 0 ? (
        <LoadingState label="Loading your updates…" />
      ) : items.length === 0 ? (
        <div className="rounded border border-line bg-white p-10 text-center">
          <div className="mb-3 text-5xl">🔔</div>
          <p className="text-sm text-storm">
            No notifications yet. Updates about your returns, sales, and verification requests will
            appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const body = (
              <div className={`flex gap-3 rounded-card border p-3 ${LEVEL_CLS[n.level]}`}>
                <span className="text-2xl leading-none">{n.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    <span className="shrink-0 text-[11px] text-storm">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-storm">{n.message}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} className="block transition-shadow hover:shadow-card">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
