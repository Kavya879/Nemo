"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { AdminMapDTO } from "@/types/dto";
import { cn } from "@/lib/cn";
import { useUser } from "@/lib/user-context";
import { isAdmin } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { CommandCenter } from "@/components/admin/CommandCenter";
import { Analytics } from "@/components/admin/Analytics";
import { ConfigControl } from "@/components/admin/ConfigControl";
import { PreventionInsights } from "@/components/admin/PreventionInsights";
import { ListingReview } from "@/components/admin/ListingReview";
import { ChallengeReview } from "@/components/admin/ChallengeReview";
import { LoadingState, ErrorState } from "@/components/flow/States";

const AdminMap = dynamic(() => import("@/components/admin/AdminMap"), {
  ssr: false,
  loading: () => <LoadingState label="Loading map…" />,
});

const TABS = [
  "Command Center",
  "Challenges",
  "Matching Map",
  "Analytics",
  "Config Control",
  "Prevention",
  "Listings",
] as const;
type Tab = (typeof TABS)[number];

function MapTab() {
  const [data, setData] = useState<AdminMapDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<"default" | "locating" | "live" | "denied">("default");

  function load(coords?: { lat: number; lng: number }) {
    apiClient
      .adminMap(coords)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }

  useEffect(() => {
    // #9: dynamic location — ask the browser, fall back to the default center.
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      setGeoStatus("locating");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoStatus("live");
          load({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setGeoStatus("denied");
          load();
        },
        { timeout: 8000 },
      );
    } else {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus("live");
        load({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setGeoStatus("denied"),
    );
  }

  if (error) return <ErrorState message={error} onRetry={() => load()} />;
  if (!data) return <LoadingState label="Loading matching map…" />;
  const matched = data.returns.filter((r) => r.matched).length;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">The Matching Map</h2>
          <p className="text-sm text-storm">
            Returned items (orange) · nearby buyers (blue) · Amazon FCs (dark) · {matched} live
            matches drawn as lines.
          </p>
        </div>
        <div className="text-right text-xs">
          <button
            onClick={useMyLocation}
            className="rounded-full bg-squid px-3 py-1 font-medium text-white hover:bg-slate"
          >
            📍 Use my live location
          </button>
          <div className="mt-1 text-storm">
            {geoStatus === "live"
              ? "Using your live location"
              : geoStatus === "locating"
                ? "Locating…"
                : geoStatus === "denied"
                  ? "Location denied — using default"
                  : "Default location"}
            {" · nearest FC: "}
            <span className="font-medium text-ink">
              {data.nearestWarehouse.name} ({data.nearestWarehouse.distanceKm}km)
            </span>
          </div>
        </div>
      </div>
      <AdminMap data={data} />
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-storm">
        <span>🟡 Returned item</span>
        <span>🔵 Nearby buyer</span>
        <span>🟢 Matched item</span>
        <span>🏭 Amazon FC</span>
        <span>— — match connection</span>
      </div>
    </div>
  );
}

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
      {tab === "Challenges" && <ChallengeReview />}
      {tab === "Matching Map" && <MapTab />}
      {tab === "Analytics" && <Analytics />}
      {tab === "Config Control" && <ConfigControl />}
      {tab === "Prevention" && <PreventionInsights />}
      {tab === "Listings" && <ListingReview />}
    </div>
  );
}
