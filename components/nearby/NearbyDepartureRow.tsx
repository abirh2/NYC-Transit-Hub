"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import { BusBadge, SubwayBullet } from "@/components/ui";
import { getBusRouteColor } from "@/lib/gtfs/bus-routes";
import {
  createBusDeepLink,
  createTrainDeepLink,
  formatDepartureEta,
  getRiderDirectionLabel,
  type NearbyService,
} from "@/lib/transit/nearby";
import { getSubwayRouteColor } from "@/lib/transit/route-colors";
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
  selected = false,
  onSelect,
  variant = "interactive",
}: {
  service: NearbyService;
  now: Date;
  selected?: boolean;
  onSelect?: (service: NearbyService) => void;
  variant?: "interactive" | "compact";
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
  const routeColor = service.mode === "subway"
    ? getSubwayRouteColor(departure.routeId)
    : getBusRouteColor(departure.routeId);

  if (variant === "compact") {
    const eta = formatDepartureEta(departure.predictedArrival, now);
    const etaMinutes = eta.replace(" min", "");
    const etaLabel = eta === "Due"
      ? "due now"
      : `in ${etaMinutes} ${etaMinutes === "1" ? "minute" : "minutes"}`;

    return (
      <article className="border-b border-border-subtle last:border-b-0">
        <Link
          href={detailHref}
          aria-label={`${departure.routeId} ${modeLabel} to ${destination} ${etaLabel}`}
          className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
        >
          <span>
            {service.mode === "subway" ? (
              <SubwayBullet line={departure.routeId} size="md" />
            ) : (
              <BusBadge route={departure.routeId} size="md" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {destination}
            </span>
            <span className="mt-0.5 block truncate text-xs text-foreground/60">
              <span>{context}</span>
              <span aria-hidden="true"> · </span>
              <span>{service.locationName}</span>
              {freshness}
            </span>
          </span>
          <Eta service={service} now={now} />
        </Link>
      </article>
    );
  }

  return (
    <article
      id={`nearby-service-${encodeURIComponent(service.id)}`}
      data-selected={selected || undefined}
      className={`flex min-w-0 border-b border-border-subtle bg-surface-panel transition-colors last:border-b-0 ${
        selected ? "bg-surface-elevated" : "hover:bg-surface-hover"
      }`}
      style={selected ? { boxShadow: `inset 3px 0 0 ${routeColor}` } : undefined}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Select ${departure.routeId} ${modeLabel} to ${destination}`}
        onClick={() => onSelect?.(service)}
        className="grid min-h-24 min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
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
          <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-foreground/55">
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
        className={`flex min-h-11 shrink-0 items-center justify-center gap-2 text-foreground/55 transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset ${
          selected ? "w-auto px-3 text-xs font-semibold" : "w-12"
        }`}
      >
        {selected && <span>{service.mode === "bus" ? "Bus details" : "Train details"}</span>}
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
