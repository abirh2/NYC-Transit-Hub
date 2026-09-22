"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type UIEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SubwayBullet } from "@/components/ui";
import {
  createTrainDeepLink,
  formatDepartureEta,
  getRiderDirectionLabel,
  groupDeparturesByDirection,
} from "@/lib/transit/nearby";
import { getSubwayRouteColor } from "@/lib/transit/route-colors";
import type { Departure, TransitDirection } from "@/types/transit";

interface NearbySubwayServicePanelProps {
  stationName: string;
  departures: Departure[];
  now: Date;
  selectedTripId: string | null;
  onSelectDeparture: (departure: Departure) => void;
}

interface DirectionPageProps extends NearbySubwayServicePanelProps {
  routeId: string;
  direction: TransitDirection;
}

function formatAccessibleEta(departure: Departure, now: Date): string {
  const eta = formatDepartureEta(departure.predictedArrival, now);
  return eta === "Due" ? "due now" : eta.replace(" min", " minutes");
}

function EtaCard({
  departure,
  now,
  selected,
  onSelect,
}: {
  departure: Departure;
  now: Date;
  selected: boolean;
  onSelect: () => void;
}) {
  const eta = formatDepartureEta(departure.predictedArrival, now);
  const minutes = eta === "Due" ? "Due" : eta.replace(" min", "");
  const destination = departure.destination ?? "Destination unavailable";
  const routeColor = getSubwayRouteColor(departure.routeId);

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Select ${departure.routeId} train in ${formatAccessibleEta(departure, now)} to ${destination}`}
      onClick={onSelect}
      className={`flex min-h-28 min-w-24 snap-start flex-col items-center justify-center rounded-xl border-2 px-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        selected
          ? "bg-surface-elevated text-foreground"
          : "border-border-subtle bg-surface-panel text-foreground/70 hover:bg-surface-hover hover:text-foreground"
      }`}
      style={{ borderColor: selected ? routeColor : "var(--border-subtle)" }}
    >
      <span className="text-3xl font-bold leading-none tracking-[-0.03em] tabular-nums">{minutes}</span>
      {eta !== "Due" && <span className="mt-1 text-xs font-medium">min</span>}
    </button>
  );
}

function DirectionPage({
  stationName,
  routeId,
  direction,
  departures,
  now,
  selectedTripId,
  onSelectDeparture,
}: DirectionPageProps) {
  const hero = departures[0];
  const selectedDeparture = departures.find((departure) => departure.tripId === selectedTripId) ?? null;
  const routeSelected = selectedDeparture !== null;
  const activeDeparture = selectedDeparture ?? hero;
  const destination = activeDeparture.destination ?? "Destination unavailable";
  const eta = formatDepartureEta(hero.predictedArrival, now);
  const minutes = eta === "Due" ? "Due" : eta.replace(" min", "");

  return (
    <div className="min-w-0">
      <button
        type="button"
        aria-pressed={routeSelected}
        aria-label={`Select ${routeId} train to ${destination}, ${formatAccessibleEta(activeDeparture, now)}`}
        onClick={() => onSelectDeparture(activeDeparture)}
        className={`grid min-h-24 w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset ${
          routeSelected
            ? "grid-cols-[auto_minmax(0,1fr)]"
            : "grid-cols-[auto_minmax(0,1fr)_auto]"
        } ${
          routeSelected ? "bg-surface-elevated" : "hover:bg-surface-hover"
        }`}
        style={routeSelected ? { boxShadow: `inset 3px 0 0 ${getSubwayRouteColor(routeId)}` } : undefined}
      >
        <SubwayBullet line={routeId} size="lg" />

        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground/65">
            {getRiderDirectionLabel(direction)}
          </span>
          <span className="mt-0.5 block text-base font-semibold leading-snug text-foreground">
            {destination}
          </span>
          <span className="mt-1 block truncate text-xs text-foreground/50">
            {stationName}
          </span>
        </span>

        {!routeSelected && (
          <span className="flex min-w-14 flex-col items-end text-right leading-none">
            <span className="text-4xl font-bold tracking-[-0.03em] tabular-nums">{minutes}</span>
            {eta !== "Due" && (
              <span className="mt-1 text-xs font-medium text-foreground/55">min</span>
            )}
          </span>
        )}
      </button>

      {routeSelected && (
        <div className="border-t border-border-subtle bg-surface-panel">
          <div
            aria-label={`Upcoming ${routeId} trains`}
            className="flex snap-x gap-2 overflow-x-auto px-4 py-3 scrollbar-none"
          >
            {departures.slice(0, 6).map((departure) => (
              <EtaCard
                key={departure.tripId}
                departure={departure}
                now={now}
                selected={departure.tripId === selectedTripId}
                onSelect={() => onSelectDeparture(departure)}
              />
            ))}
          </div>
          <div className="flex justify-end border-t border-border-subtle px-2">
            <Link
              href={createTrainDeepLink(selectedDeparture)}
              aria-label={`View ${routeId} train details`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-foreground/75 transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Train details
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function RouteCard({
  stationName,
  routeId,
  departures,
  now,
  selectedTripId,
  onSelectDeparture,
}: Omit<NearbySubwayServicePanelProps, "departures"> & {
  routeId: string;
  departures: Departure[];
}) {
  const groups = useMemo(() => groupDeparturesByDirection(departures), [departures]);
  const railRef = useRef<HTMLDivElement>(null);
  const initiallySelectedDirection = groups.find((group) =>
    group.departures.some((departure) => departure.tripId === selectedTripId))?.direction;
  const [requestedDirection, setRequestedDirection] = useState<TransitDirection | null>(
    initiallySelectedDirection ?? groups[0]?.direction ?? null,
  );
  const activeDirection = groups.some((group) => group.direction === requestedDirection)
    ? requestedDirection
    : groups[0]?.direction ?? null;
  const activeDirectionLabel = activeDirection
    ? getRiderDirectionLabel(activeDirection)
    : "Direction unavailable";

  const selectDirection = (direction: TransitDirection, index: number) => {
    setRequestedDirection(direction);
    if (railRef.current && typeof railRef.current.scrollTo === "function") {
      railRef.current.scrollTo({ left: railRef.current.clientWidth * index, behavior: "auto" });
    }
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const pageWidth = Math.max(event.currentTarget.clientWidth, 1);
    const direction = groups[Math.round(event.currentTarget.scrollLeft / pageWidth)]?.direction;
    if (direction && direction !== activeDirection) setRequestedDirection(direction);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = Math.max(
      groups.findIndex((group) => group.direction === activeDirection),
      0,
    );
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % groups.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + groups.length) % groups.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = groups.length - 1;
    if (nextIndex === null || groups.length < 2) return;

    event.preventDefault();
    selectDirection(groups[nextIndex].direction, nextIndex);
  };

  return (
    <article aria-labelledby={`nearby-route-${routeId}`} className="border-b border-border-subtle last:border-b-0">
      <h4 id={`nearby-route-${routeId}`} className="sr-only">{routeId} train departures</h4>
      <p id={`nearby-route-${routeId}-swipe-help`} className="sr-only">
        Swipe horizontally or use the left and right arrow keys to change direction.
      </p>

      <div
        ref={railRef}
        role="group"
        aria-label={`${routeId} train, ${activeDirectionLabel}`}
        aria-describedby={groups.length > 1 ? `nearby-route-${routeId}-swipe-help` : undefined}
        tabIndex={groups.length > 1 ? 0 : -1}
        data-testid={`subway-route-${routeId}-pages`}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset [touch-action:pan-x_pan-y] scrollbar-none"
      >
        {groups.map((group) => {
          const active = group.direction === activeDirection;
          return (
            <div
              key={group.direction}
              aria-hidden={!active}
              inert={!active}
              className="w-full shrink-0 snap-start"
            >
              <DirectionPage
                stationName={stationName}
                routeId={routeId}
                direction={group.direction}
                departures={group.departures}
                now={now}
                selectedTripId={selectedTripId}
                onSelectDeparture={onSelectDeparture}
              />
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function NearbySubwayServicePanel({
  stationName,
  departures,
  now,
  selectedTripId,
  onSelectDeparture,
}: NearbySubwayServicePanelProps) {
  const routeGroups = useMemo(() => {
    const routes = new Map<string, Departure[]>();
    for (const departure of departures) {
      if (departure.predictedArrival.getTime() < now.getTime()) continue;
      routes.set(departure.routeId, [...(routes.get(departure.routeId) ?? []), departure]);
    }
    return [...routes.entries()].sort(([, left], [, right]) =>
      left[0].predictedArrival.getTime() - right[0].predictedArrival.getTime());
  }, [departures, now]);

  if (routeGroups.length === 0) return null;

  return (
    <section aria-label="Nearby subway departures" className="border-b border-border-subtle">
      {routeGroups.map(([routeId, routeDepartures]) => (
        <RouteCard
          key={routeId}
          stationName={stationName}
          routeId={routeId}
          departures={routeDepartures}
          now={now}
          selectedTripId={selectedTripId}
          onSelectDeparture={onSelectDeparture}
        />
      ))}
    </section>
  );
}
