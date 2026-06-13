import { cn } from "@/lib/cn";
import type { Grade } from "@/types";

const GRADE_STYLES: Record<Grade, string> = {
  A: "bg-gradeA text-white",
  B: "bg-gradeB text-white",
  C: "bg-gradeC text-white",
  D: "bg-gradeD text-white",
};

const GRADE_LABEL: Record<Grade, string> = {
  A: "Like new",
  B: "Lightly used",
  C: "Visibly used",
  D: "For parts / repair",
};

export function GradeBadge({
  grade,
  size = "md",
  showLabel = false,
}: {
  grade: Grade;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const dim =
    size === "lg" ? "h-12 w-12 text-2xl" : size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9 text-lg";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-bold",
          dim,
          GRADE_STYLES[grade],
        )}
        aria-label={`Grade ${grade}`}
      >
        {grade}
      </span>
      {showLabel && (
        <span className="text-sm font-medium text-storm">{GRADE_LABEL[grade]}</span>
      )}
    </span>
  );
}
