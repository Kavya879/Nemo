import { cn } from "@/lib/cn";

export const SPINE_STEPS = ["Return", "Grade", "Route", "Match", "List"] as const;
export type SpineStep = (typeof SPINE_STEPS)[number];

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center justify-center gap-2">
      {SPINE_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                done && "bg-success text-white",
                active && "bg-zest text-ink ring-2 ring-zestDark",
                !done && !active && "bg-mist text-storm",
              )}
            >
              {done ? "✓" : i + 1}
            </div>
            <span
              className={cn(
                "hidden text-sm font-medium sm:inline",
                active ? "text-ink" : "text-storm",
              )}
            >
              {label}
            </span>
            {i < SPINE_STEPS.length - 1 && (
              <span className="h-px w-6 bg-line sm:w-10" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
