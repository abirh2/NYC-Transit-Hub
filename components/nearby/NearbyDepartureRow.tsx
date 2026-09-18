"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import { BusBadge, SubwayBullet } from "@/components/ui";
import {
  createBusDeepLink,
  createTrainDeepLink,
  formatDepartureEta,
  getRiderDirectionLabel,
  type NearbyService,
} from "@/lib/transit/nearby";
import { estimateWalkingTime, formatWalkingTime } from "@/lib/utils/distance";

function Eta({ service, now }: { service: NearbyService; now: Date }) {
  const formatted = formatDepartureEta(service.departure.predictedArrival, now);
  if (formatted === "Due") {
    return (
      <span aria-label="Due now" className="text-right text-2xl font-bold tracking-tight tabular-nums">
        Due
      </span>
    );
  }

  const minutes = formatted.replace(" min", "");
  return (
    <span
      aria-label={`${minutes} ${minutes === "1" ? "minute" : "minutes"}`}
      className="flex min-w-14 flex-col items-end leading-none"
    >
      <span className="text-4xl font-bold tracking-[-0.03em] tabular-nums">{minutes}</span>
      <span aria-hidden="true" className="mt-1 text-xs font-medium text-foreground/55">min</span>
    </span>
  );
}

export function NearbyDepartureRow({
  service,
  now,
  selected,
  onSelect,
}: {
  service: NearbyService;
  now: Date;
  selected: boolean;
  onSelect: (service: NearbyService) => void;
}) {
  const departure = service.departure;
  const modeLabel = service.mode === "subway" ? "train" : "bus";
  const destination = departure.destination ?? "Destination unavailable";
  const detailHref = service.mode === "subway"
    ? createTrainDeepLink(departure)
    : createBusDeepLink(departure);
  const context = service.mode === "subway"
    ? getRiderDirectionLabel(departure.direction)
    : departure.progressText ?? (
      departure.stopsAway === 0
        ? "At stop"
        : departure.stopsAway
          ? `${departure.stopsAway} ${departure.stopsAway === 1 ? "stop" : "stops"} away`
          : getRiderDirectionLabel(departure.direction)
    );
  const freshness = service.sourceState === "stale" ? " · Updates delayed" : "";

  return (
    <article
      id={`nearby-service-${encodeURIComponent(service.id)}`}
      data-selected={selected || undefined}
      className={`flex min-w-0 border-b border-border-subtle transition-colors last:border-b-0 ${
        selected ? "bg-surface-selected/65" : "bg-surface-panel hover:bg-surface-hover"
      }`}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Select ${departure.routeId} ${modeLabel} to ${destination}`}
        onClick={() => onSelect(service)}
        className="grid min-h-28 min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
      >
        <span className="self-start pt-1">
          {service.mode === "subway" ? (
            <SubwayBullet line={departure.routeId} size="lg" selected={selected} />
          ) : (
            <BusBadge route={departure.routeId} size="lg" />
          )}
        </span>

        <span className="min-w-0 self-start">
          <span className="block text-sm font-semibold text-foreground/75">{context}</span>
          <span className="mt-0.5 block text-base font-semibold leading-snug text-foreground">
            {destination}
          </span>
          <span className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-foreground/55">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{service.locationName}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">
              {formatWalkingTime(estimateWalkingTime(service.distanceMiles))}{freshness}
            </span>
          </span>
        </span>

        <Eta service={service} now={now} />
      </button>

      <Link
        href={detailHref}
        aria-label={`View ${departure.routeId} ${modeLabel} details`}
        className="flex min-h-11 w-12 shrink-0 items-center justify-center border-l border-border-subtle text-foreground/55 transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
      >
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
