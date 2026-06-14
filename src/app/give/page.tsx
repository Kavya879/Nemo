"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { CharityDTO, DonationCertificateDTO, ItemDTO, NeighbourResultDTO } from "@/types/dto";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ProductImage";
import { LoadingState, ErrorState } from "@/components/flow/States";

const UNAVAILABLE = new Set(["SOLD", "DONATED", "RECYCLED"]);

export default function GivePage() {
  const [items, setItems] = useState<ItemDTO[] | null>(null);
  const [charities, setCharities] = useState<CharityDTO[]>([]);
  const [selected, setSelected] = useState<ItemDTO | null>(null);
  const [mode, setMode] = useState<"choose" | "donate" | "peer">("choose");
  const [charityId, setCharityId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cert, setCert] = useState<DonationCertificateDTO | null>(null);
  const [peer, setPeer] = useState<NeighbourResultDTO | null>(null);

  function load() {
    setError(null);
    Promise.all([apiClient.getItems(), apiClient.getCharities()])
      .then(([its, chs]) => {
        setItems(its.filter((i) => !UNAVAILABLE.has(i.status)));
        setCharities(chs);
        setCharityId(chs[0]?.id ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }
  useEffect(load, []);

  function reset() {
    setSelected(null);
    setMode("choose");
    setCert(null);
    setPeer(null);
    setError(null);
    load();
  }

  async function donate() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      setCert(await apiClient.donateItem(selected.id, charityId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not donate");
    } finally {
      setBusy(false);
    }
  }

  function withGeo(): Promise<{ lat: number; lng: number } | undefined> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(undefined),
        { timeout: 6000 },
      );
    });
  }

  async function passToNeighbour() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const coords = await withGeo();
      setPeer(await apiClient.passToNeighbour(selected.id, coords));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pass on");
    } finally {
      setBusy(false);
    }
  }

  // ── Result screens ──
  if (cert) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-3xl">🎁</div>
        <h1 className="text-2xl font-bold">Thank you for donating!</h1>
        <div className="mt-4 rounded-card border border-success/30 bg-success/5 p-5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-storm">Donation Certificate</span>
            <span className="font-mono text-xs text-storm">{cert.certificateId}</span>
          </div>
          <p className="mt-2 text-lg font-bold text-ink">
            {cert.charity.icon} {cert.itemName} → {cert.charity.name}
          </p>
          <p className="text-sm text-storm">{cert.charity.focus}</p>
          <p className="mt-2 text-sm font-medium text-success">{cert.impact}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center text-sm">
            <div><div className="font-bold text-ink">+{cert.credits}</div><div className="text-[11px] text-storm">Green credits</div></div>
            <div><div className="font-bold text-ink">{cert.co2SavedKg}kg</div><div className="text-[11px] text-storm">CO₂ saved</div></div>
            <div><div className="font-bold text-ink">₹{cert.costSaved.toLocaleString("en-IN")}</div><div className="text-[11px] text-storm">Value kept in use</div></div>
          </div>
        </div>
        <div className="mt-5 flex justify-center gap-3">
          <Button onClick={reset}>Give another item</Button>
          <Link href="/impact"><Button variant="secondary">View your impact →</Button></Link>
        </div>
      </div>
    );
  }

  if (peer) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-link/10 text-3xl">🤝</div>
        {peer.matched ? (
          <>
            <h1 className="text-2xl font-bold">Passed to a neighbour!</h1>
            <p className="mt-2 text-sm text-storm">
              Your <span className="font-medium text-ink">{peer.itemName}</span> was matched to a verified buyer{" "}
              <span className="font-medium text-ink">~{peer.distanceKm}km</span> away. Their identity is protected — our
              delivery partner handles the hand-off.
            </p>
            <div className="mt-3 inline-flex gap-4 rounded-card border border-line bg-white px-5 py-3 text-sm">
              <span><span className="font-bold text-ink">+{peer.credits}</span> credits</span>
              <span><span className="font-bold text-ink">{peer.co2SavedKg}kg</span> CO₂ saved</span>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">No nearby neighbour yet</h1>
            <p className="mt-2 text-sm text-storm">
              No interested buyer was found near you right now. Try donating it instead, or check back later.
            </p>
          </>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <Button onClick={reset}>Give another item</Button>
          <Link href="/impact"><Button variant="secondary">View your impact →</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">Give an item a second life 🌱</h1>
      <p className="text-sm text-storm">
        Don&apos;t bin a usable item — donate it to a charity partner or pass it to a verified neighbour, and earn green
        credits for keeping it in circulation.
      </p>

      {error && <div className="mt-4"><ErrorState message={error} onRetry={load} /></div>}
      {!items && !error && <div className="mt-6"><LoadingState label="Loading your items…" /></div>}

      {items && !selected && (
        <>
          <h2 className="mb-2 mt-5 text-lg font-bold">Pick an item</h2>
          {items.length === 0 ? (
            <p className="rounded border border-line bg-white p-6 text-center text-sm text-storm">
              No available items to give right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => { setSelected(it); setMode("choose"); }}
                  className="flex items-center gap-3 rounded border border-line bg-white p-3 text-left hover:shadow-cardHover"
                >
                  <ProductImage src={it.imageUrl} category={it.category} alt={it.name} className="h-14 w-14 rounded" />
                  <div>
                    <div className="font-semibold text-ink">{it.name}</div>
                    <div className="text-xs text-storm">{it.category} · ₹{it.originalPrice.toLocaleString("en-IN")}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="mt-5 rounded-card border border-line bg-white p-5">
          <button onClick={() => setSelected(null)} className="text-sm font-medium text-link hover:underline">
            ← Choose a different item
          </button>
          <div className="mt-3 flex items-center gap-3">
            <ProductImage src={selected.imageUrl} category={selected.category} alt={selected.name} className="h-16 w-16 rounded" />
            <div>
              <div className="font-bold text-ink">{selected.name}</div>
              <div className="text-xs text-storm">{selected.category} · ₹{selected.originalPrice.toLocaleString("en-IN")}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {/* Donate */}
            <div className={`rounded border p-4 ${mode === "donate" ? "border-success/50 bg-success/5" : "border-line"}`}>
              <div className="text-lg font-bold text-ink">🎁 Donate to charity</div>
              <p className="mb-2 text-xs text-storm">Give it to a verified charity partner and earn green credits.</p>
              <select
                value={charityId}
                onChange={(e) => { setCharityId(e.target.value); setMode("donate"); }}
                className="mb-2 w-full rounded border border-line px-2 py-1.5 text-sm"
              >
                {charities.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name} — {c.focus}</option>
                ))}
              </select>
              <Button disabled={busy} onClick={donate} className="w-full">
                {busy && mode === "donate" ? "Donating…" : "Donate this item"}
              </Button>
            </div>

            {/* Peer-to-peer */}
            <div className="rounded border border-line p-4">
              <div className="text-lg font-bold text-ink">🤝 Pass to a neighbour</div>
              <p className="mb-2 text-xs text-storm">
                Match it to a verified buyer near you (identity protected) — the lowest-logistics second life.
              </p>
              <Button variant="secondary" disabled={busy} onClick={() => { setMode("peer"); passToNeighbour(); }} className="w-full">
                {busy && mode === "peer" ? "Finding a neighbour…" : "Find a nearby neighbour"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
