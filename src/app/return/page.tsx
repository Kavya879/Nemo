import { Suspense } from "react";
import { ReturnWorkflow } from "@/components/flow/ReturnWorkflow";
import { LoadingState } from "@/components/flow/States";

export default function ReturnPage() {
  return (
    <Suspense fallback={<div className="p-8"><LoadingState label="Loading…" /></div>}>
      <ReturnWorkflow />
    </Suspense>
  );
}
