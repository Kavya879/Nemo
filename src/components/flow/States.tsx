import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

/** Shared loading + error UI so no step is ever a dead end. */

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Spinner className="h-8 w-8" />
      <p className="text-sm font-medium text-storm">{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-danger/30 bg-danger/5 py-10 text-center">
      <div className="text-3xl">⚠️</div>
      <p className="max-w-md text-sm text-danger">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
