"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type UIEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SubwayBullet } from "@/components/ui";
import { createTrainDeepLink, formatDepartureEta, getRiderDirectionLabel, groupDeparturesByDirection } from "@/lib/transit/nearby";
import type { Departure, TransitDirection } from "@/types/transit";

interface NearbySubwayServicePanelProps {
  stationName: string;
  departures: Departure[];
  now: Date;
  selectedTripId: string | null;
  onSelectDeparture: (departure: Departure) => void;
}

function formatAccessibleEta(departure: Departure, now: Date): string {
  const eta = formatDepartureEta(departure.predictedArrival, now);
  return eta === "Due" ? "due now" : eta.replace(" min", " minutes");
}

function DirectionPage({ stationName, routeId, direction, departures, now, expanded, selectedTripId, onToggleExpanded, onSelectDeparture }: {
  stationName: string; routeId: string; direction: TransitDirection; departures: Departure[]; now: Date; expanded: boolean; selectedTripId: string | null; onToggleExpanded: () => void; onSelectDeparture: (departure: Departure) => void;
}) {
  const hero = departures[0];
  const secondaryDepartures = departures.slice(1, 6);
  const destination = hero.destination ?? "Destination unavailable";
  const eta = formatDepartureEta(hero.predictedArrival, now);
  const minutes = eta === "Due" ? "Due" : eta.replace(" min", "");
  const selected = selectedTripId === hero.tripId;

  return <div className="min-w-0">
    <button type="button" aria-pressed={selected} aria-expanded={expanded} aria-label={`Select ${routeId} train to ${destination}, ${formatAccessibleEta(hero, now)}`} onClick={() => { onSelectDeparture(hero); onToggleExpanded(); }} className={`grid min-h-28 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset ${selected ? "bg-surface-selected/70" : "hover:bg-surface-hover"}`}>
      <span className="pt-1"><SubwayBullet line={routeId} size="sm" selected={selected} /></span>
      <span className="min-w-0 pt-0.5"><span className="block text-xs font-semibold text-foreground/70">{getRiderDirectionLabel(direction)}</span><span className="mt-0.5 block text-base font-semibold leading-snug text-foreground">{destination}</span><span className="mt-0.5 block truncate text-[11px] text-foreground/50">{stationName}</span><span className="mt-1.5 block text-[11px] font-medium text-foreground/55">{selected ? "Selected on map" : "Tap to follow this train"}</span></span>
      <span className="flex min-w-12 flex-col items-end self-center text-right"><span className="text-3xl font-bold leading-none tracking-[-0.04em] tabular-nums">{minutes}</span>{eta !== "Due" && <span className="mt-0.5 text-xs font-medium text-foreground/60">minutes</span>}</span>
    </button>
    {selected && <div className="flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-selected/40 px-4 py-2"><p className="text-xs text-foreground/60">Route and train highlighted above</p><Link href={createTrainDeepLink(hero)} aria-label={`View ${routeId} train details`} className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-state-selected hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">Train details <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div>}
    {expanded && secondaryDepartures.length > 0 && <div className="border-t border-border-subtle px-4 py-2" aria-label={`More ${routeId} trains`}><div className="grid grid-cols-2 gap-2">{secondaryDepartures.map((departure) => <Link key={departure.tripId} href={createTrainDeepLink(departure)} aria-label={`${routeId} train in ${formatAccessibleEta(departure, now)} to ${departure.destination ?? "Destination unavailable"}`} className="flex min-h-14 min-w-0 items-center justify-between gap-2 rounded-md bg-surface-elevated px-2.5 py-2 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><span className="flex min-w-0 items-center gap-2"><SubwayBullet line={routeId} size="xs" /><span className="truncate text-xs text-foreground/60">{departure.destination ?? "Destination unavailable"}</span></span><span className="shrink-0 text-base font-bold tabular-nums">{formatDepartureEta(departure.predictedArrival, now)}</span></Link>)}</div></div>}
  </div>;
}

function RouteCard({ stationName, routeId, departures, now, selectedTripId, onSelectDeparture }: { stationName: string; routeId: string; departures: Departure[]; now: Date; selectedTripId: string | null; onSelectDeparture: (departure: Departure) => void; }) {
  const groups = useMemo(() => groupDeparturesByDirection(departures), [departures]);
  const railRef = useRef<HTMLDivElement>(null);
  const [requestedDirection, setRequestedDirection] = useState<TransitDirection | null>(groups[0]?.direction ?? null);
  const [expandedDirections, setExpandedDirections] = useState<Set<TransitDirection>>(() => new Set());
  const activeDirection = groups.some((group) => group.direction === requestedDirection) ? requestedDirection : groups[0]?.direction ?? null;
  const selectDirection = (direction: TransitDirection, index: number) => { setRequestedDirection(direction); if (railRef.current && typeof railRef.current.scrollTo === "function") railRef.current.scrollTo({ left: railRef.current.clientWidth * index, behavior: "smooth" }); };
  const handleScroll = (event: UIEvent<HTMLDivElement>) => { const index = Math.round(event.currentTarget.scrollLeft / Math.max(event.currentTarget.clientWidth, 1)); const direction = groups[index]?.direction; if (direction && direction !== activeDirection) setRequestedDirection(direction); };
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => { let next: number | null = null; if (event.key === "ArrowRight") next = (index + 1) % groups.length; if (event.key === "ArrowLeft") next = (index - 1 + groups.length) % groups.length; if (event.key === "Home") next = 0; if (event.key === "End") next = groups.length - 1; if (next === null) return; event.preventDefault(); selectDirection(groups[next].direction, next); document.getElementById(`nearby-${routeId}-direction-tab-${groups[next].direction}`)?.focus(); };

  return <article aria-labelledby={`nearby-route-${routeId}`} className="border-t border-border-subtle"><h4 id={`nearby-route-${routeId}`} className="sr-only">{routeId} train departures</h4><div className="sr-only" role="tablist" aria-label={`${routeId} train directions`}>{groups.map((group, index) => { const selected = group.direction === activeDirection; return <button key={group.direction} id={`nearby-${routeId}-direction-tab-${group.direction}`} type="button" role="tab" aria-label={`${routeId} ${getRiderDirectionLabel(group.direction)}`} aria-selected={selected} aria-controls={`nearby-${routeId}-direction-page-${group.direction}`} tabIndex={selected ? 0 : -1} onClick={() => selectDirection(group.direction, index)} onKeyDown={(event) => handleKeyDown(event, index)}>Direction {index + 1}</button>; })}</div><div ref={railRef} data-testid={`subway-route-${routeId}-pages`} onScroll={handleScroll} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [touch-action:pan-x_pan-y] scrollbar-none">{groups.map((group) => { const selected = group.direction === activeDirection; return <div key={group.direction} id={`nearby-${routeId}-direction-page-${group.direction}`} role="tabpanel" aria-label={`${routeId} ${getRiderDirectionLabel(group.direction)}`} aria-hidden={!selected} inert={!selected} className="w-full shrink-0 snap-start"><DirectionPage stationName={stationName} routeId={routeId} direction={group.direction} departures={group.departures} now={now} expanded={expandedDirections.has(group.direction)} selectedTripId={selectedTripId} onSelectDeparture={onSelectDeparture} onToggleExpanded={() => setExpandedDirections((current) => { const next = new Set(current); if (next.has(group.direction)) next.delete(group.direction); else next.add(group.direction); return next; })} /></div>; })}</div></article>;
}

export function NearbySubwayServicePanel({ stationName, departures, now, selectedTripId, onSelectDeparture }: NearbySubwayServicePanelProps) {
  const routeGroups = useMemo(() => { const upcoming = departures.filter((departure) => departure.predictedArrival.getTime() >= now.getTime()); const routes = new Map<string, Departure[]>(); for (const departure of upcoming) routes.set(departure.routeId, [...(routes.get(departure.routeId) ?? []), departure]); return [...routes.entries()]; }, [departures, now]);
  if (routeGroups.length === 0) return null;
  return <section aria-label="Nearby subway departures" className="border-b border-border-subtle"><div>{routeGroups.map(([routeId, routeDepartures]) => <RouteCard key={routeId} stationName={stationName} routeId={routeId} departures={routeDepartures} now={now} selectedTripId={selectedTripId} onSelectDeparture={onSelectDeparture} />)}</div></section>;
}
