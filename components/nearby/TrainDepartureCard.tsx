"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import { createTrainDeepLink, formatDepartureEta } from "@/lib/transit/nearby";
import type { Departure } from "@/types/transit";

interface TrainDepartureCardProps {
  departure: Departure;
  now: Date;
  hero?: boolean;
}

export function TrainDepartureCard({ departure, now, hero = false }: TrainDepartureCardProps) {
  const eta = formatDepartureEta(departure.predictedArrival, now);
  const destination = departure.destination ?? "Destination unavailable";

  return (
    <Link
      href={createTrainDeepLink(departure)}
      aria-label={`${departure.routeId} train, ${eta}, to ${destination}. View live trip`}
      className={`group flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-panel p-4 transition-colors hover:border-border-strong hover:bg-surface-hover ${
        hero ? "border-state-selected/50 bg-surface-selected/40" : ""
      }`}
    >
      <SubwayBullet line={departure.routeId} size={hero ? "lg" : "md"} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={hero ? "text-4xl font-bold tracking-tight tabular-nums" : "text-lg font-semibold tabular-nums"}
          >
            {eta}
          </span>
          <span className="text-sm text-foreground/60">
            {departure.status === "realtime" ? "predicted" : "scheduled"}
          </span>
        </span>
        <span className="mt-1 block truncate text-sm font-medium">{destination}</span>
        <span className="mt-1 block text-xs text-foreground/55">
          {departure.direction} · {departure.tripId}
        </span>
      </span>
      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-foreground/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
