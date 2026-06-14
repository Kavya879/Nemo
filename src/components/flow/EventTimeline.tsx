import type { ReturnEventDTO } from "@/types/dto";

/** The traceable audit trail — every persisted state transition. */
export function EventTimeline({ events }: { events: ReturnEventDTO[] }) {
  if (events.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-storm">
        Workflow history ({events.length} events)
      </h2>
      <ol className="space-y-0 border-l-2 border-line pl-4">
        {events.map((e) => (
          <li key={e.id} className="relative pb-4 last:pb-0">
            <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-link" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">{e.status}</span>
              <span className="text-xs text-storm">
                {new Date(e.createdAt).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="text-sm text-ink">{e.message}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
