"use client";

import { useEffect, useState } from "react";

/** Live countdown to the Second Life window deadline. */
export function Countdown({ deadline }: { deadline: string }) {
  const target = new Date(deadline).getTime();
  const [now, setNow] = useState<number>(() => target); // avoids hydration mismatch; corrected on mount

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = Math.max(target - now, 0);
  const expired = ms <= 0;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);

  return (
    <span
      className={`rounded-full px-3 py-1 font-mono text-sm font-bold ${
        expired ? "bg-danger/10 text-danger" : "bg-ember/15 text-ember"
      }`}
      title="Time left in the Second Life opportunity window"
    >
      {expired ? "Window closed" : `${d}d ${h}h ${m}m ${s}s left`}
    </span>
  );
}
