import { cn } from "@/lib/cn";

export function Spinner({
  className,
  label = "Loading…",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-block h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-link",
          className,
        )}
      />
    </span>
  );
}
