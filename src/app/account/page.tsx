"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useUser } from "@/lib/user-context";
import type { CreditTotalsDTO } from "@/types/dto";

const CARDS = [
  {
    href: "/orders",
    icon: "📦",
    title: "Your Orders",
    desc: "Track, return, or buy things again",
  },
  {
    href: "/impact",
    icon: "🌱",
    title: "Amazon Nemo Credits & Impact",
    desc: "Your balance, CO₂ saved, and rewards",
  },
  {
    href: "/coupons",
    icon: "🎟️",
    title: "Redeemed Coupons",
    desc: "Your coupon codes and where to use them",
  },
  {
    href: "/sell",
    icon: "🏷️",
    title: "Sell on Amazon Nemo",
    desc: "List your own items for second-life resale",
  },
  {
    href: "/return",
    icon: "↩️",
    title: "Returns",
    desc: "Start or manage a return",
  },
  {
    href: "/marketplace",
    icon: "🛒",
    title: "Second-Life Marketplace",
    desc: "Shop certified pre-owned deals",
  },
];

export default function AccountPage() {
  const { user } = useUser();
  const [totals, setTotals] = useState<CreditTotalsDTO | null>(null);

  useEffect(() => {
    apiClient.getCreditTotals().then(setTotals).catch(() => setTotals(null));
  }, [user.id]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Your Account</h1>

      {/* User identity panel */}
      <div className="mt-4 flex flex-col gap-4 rounded border border-line bg-white p-5 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-squid text-2xl text-zest">
          👤
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold text-ink">Hello, {user.name}</div>
          <div className="text-sm text-storm">
            {user.role === "owner" ? "Owner / seller account" : "Buyer account"}
          </div>
          <Link href="/login" className="text-xs font-medium text-link hover:underline">
            Switch account
          </Link>
        </div>
        <div className="rounded bg-cloud px-5 py-3 text-center">
          <div className="text-xs text-storm">Amazon Nemo Credits</div>
          <div className="text-3xl font-bold text-zest">
            {totals ? totals.availableBalance : "—"}
          </div>
          <Link href="/impact" className="text-xs font-medium text-link hover:underline">
            Redeem
          </Link>
        </div>
      </div>

      {/* Account cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="flex items-start gap-4 rounded border border-line bg-white p-4 transition-shadow hover:shadow-cardHover"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mist/70 text-2xl">
              {c.icon}
            </div>
            <div>
              <div className="font-bold text-ink">{c.title}</div>
              <div className="text-sm text-storm">{c.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
