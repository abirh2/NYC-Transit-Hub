import Link from "next/link";
import { ArrowRight, Navigation } from "lucide-react";

import { BusBadge, StatusChip } from "@/components/ui";
import { createBusDeepLink, formatDepartureEta } from "@/lib/transit/nearby";
import type { Departure } from "@/types/transit";

export function BusDepartureCard({
  departure,
  now,
  hero = false,
}: {
  departure: Departure;
  now: Date;
  hero?: boolean;
}) {
  const progress = departure.progressText ?? (
    departure.stopsAway === null || departure.stopsAway === undefined
      ? null
      : departure.stopsAway === 0
        ? "At stop"
        : `${departure.stopsAway} ${departure.stopsAway === 1 ? "stop" : "stops"} away`
  );

  return (
    <Link
      href={createBusDeepLink(departure)}
      className={`group flex min-h-12 items-center justify-between gap-3 rounded-md border border-border-subtle text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${hero ? "bg-surface-selected px-3 py-3" : "px-3 py-2 hover:bg-surface-hover"}`}
      aria-label={`${departure.routeId} bus to ${departure.destination ?? "destination unavailable"}, ${formatDepartureEta(departure.predictedArrival, now)}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <BusBadge route={departure.routeId} size={hero ? "md" : "sm"} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {departure.destination ?? "Destination unavailable"}
          </span>
          <span className="flex items-center gap-1 truncate text-xs text-foreground/60">
            <Navigation className="h-3 w-3 shrink-0" aria-hidden="true" />
            {progress ?? "Live prediction"}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <StatusChip state={departure.minutesAway !== null && departure.minutesAway <= 1 ? "normal" : "advisory"} label={formatDepartureEta(departure.predictedArrival, now)} size="sm" />
        <ArrowRight className="h-4 w-4 text-foreground/45 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
