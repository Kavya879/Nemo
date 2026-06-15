"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useUser } from "@/lib/user-context";
import { isAdmin } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { CommandCenter } from "@/components/admin/CommandCenter";
import { ConfigControl } from "@/components/admin/ConfigControl";
import { ListingReview } from "@/components/admin/ListingReview";
import { ChallengeReview } from "@/components/admin/ChallengeReview";
import { DeliveryRejections } from "@/components/admin/DeliveryRejections";

// The Operations Console is intentionally focused on operational management and
// review workflows only. Dashboards/analytics/experimental widgets are not part
// of the admin home.
const TABS = ["Command Center", "Rejections", "Challenges", "Listings", "Config Control"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("Command Center");

  // #1: the operations console is restricted to admin accounts.
  if (!isAdmin(user)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mb-3 text-5xl">🔒</div>
        <h1 className="text-2xl font-bold">Admin access only</h1>
        <p className="mt-2 text-sm text-storm">
          The Operations Console is restricted to Amazon Nemo operations staff. You&apos;re
          signed in as <span className="font-semibold">{user.name}</span> ({user.role}).
        </p>
        <Link href="/login" className="mt-5 inline-block">
          <Button size="lg">Switch to an admin account</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Operations Console</h1>
        <p className="text-sm text-storm">
          The small seller&apos;s 200 manual returns — fully automated, at scale.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-t px-4 py-2 text-sm font-medium",
              tab === t ? "border-b-2 border-ember bg-white text-ink" : "text-storm hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Command Center" && <CommandCenter />}
      {tab === "Rejections" && <DeliveryRejections />}
      {tab === "Challenges" && <ChallengeReview />}
      {tab === "Listings" && <ListingReview />}
      {tab === "Config Control" && <ConfigControl />}
    </div>
  );
}
