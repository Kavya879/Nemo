import { cn } from "@/lib/cn";

/** Consistent page width + padding wrapper used by every screen. */
export function PageShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-8", className)}>
      {children}
    </div>
  );
}
