"use client";

import { useEffect, useState } from "react";

/**
 * "Deliver to" selector. The destination is the user's own choice — read from
 * localStorage (and optionally the browser's geolocation), never a hardcoded
 * city. Until the user sets one, it invites them to choose.
 */
const KEY = "nemo-deliver-to-v1";

export function DeliverTo() {
  const [location, setLocation] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      setLocation(localStorage.getItem(KEY));
    } catch {
      /* ignore */
    }
  }, []);

  function save(value: string) {
    const v = value.trim();
    if (!v) return;
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
    setLocation(v);
    setEditing(false);
    setDraft("");
  }

  function useGeolocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) =>
      save(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`),
    );
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(draft);
        }}
        className="hidden items-center gap-1 lg:flex"
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="City or PIN code"
          className="h-7 w-32 rounded px-2 text-xs text-ink outline-none"
        />
        <button type="submit" className="text-xs underline">
          Save
        </button>
        <button type="button" onClick={useGeolocation} title="Use my location" className="text-sm">
          📍
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="hidden items-end gap-1 rounded border border-transparent px-2 py-1 text-left hover:border-white lg:flex"
    >
      <span className="text-lg">📍</span>
      <div className="leading-tight">
        <div className="text-xs text-mist/70">Deliver to</div>
        <div className="text-sm font-bold">{location ?? "Select your location"}</div>
      </div>
    </button>
  );
}
