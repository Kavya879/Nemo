import { cn } from "@/lib/cn";

/**
 * Amazon Nemo wordmark. "amazon" in white with the signature orange smile-arrow
 * underline, followed by the "nemo" sub-brand in ember orange. Used in the
 * header, login screen and footer so the brand is defined in exactly one place.
 *
 * `tone="dark"` renders for dark backgrounds (header/footer); `tone="light"`
 * renders the "amazon" word in ink for light backgrounds (login).
 */
export function Logo({
  tone = "dark",
  className,
  size = "md",
}: {
  tone?: "dark" | "light";
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const amazonColor = tone === "dark" ? "text-white" : "text-ink";
  const sizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  } as const;

  return (
    <span className={cn("inline-flex select-none flex-col leading-none", className)} aria-label="Amazon Nemo">
      <span className={cn("font-bold tracking-tight", sizes[size])}>
        <span className={amazonColor}>amazon</span>
        <span className="text-ember"> nemo</span>
      </span>
      {/* Signature smile arc, scaled to the wordmark */}
      <svg
        viewBox="0 0 100 14"
        className={cn(
          "mt-0.5 w-full",
          size === "sm" ? "h-2" : size === "lg" ? "h-3.5" : "h-2.5",
        )}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 4 C 28 16, 72 16, 96 4"
          stroke="#ff9900"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M92 2 L 97 4 L 92 8" stroke="#ff9900" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
