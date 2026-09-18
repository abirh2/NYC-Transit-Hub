"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { BusFront, ChevronDown, LocateFixed, MapPin, RefreshCw, TrainFront } from "lucide-react";

import { BusDepartureCard } from "@/components/nearby/BusDepartureCard";
import { NearbyLocationCard } from "@/components/nearby/NearbyLocationCard";
import { TrainDepartureCard } from "@/components/nearby/TrainDepartureCard";
import {
  BusBadge,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  StatusChip,
  SubwayBullet,
  Surface,
} from "@/components/ui";
import { useGeolocation } from "@/lib/hooks";
import { getDirectionLabel } from "@/lib/transit/direction";
import {
  getFreshnessLabel,
  getRiderDirectionLabel,
  groupDeparturesByDirection,
  selectNextDeparture,
  sortNearbyLocations,
  sortUniqueDepartures,
} from "@/lib/transit/nearby";
import {
  estimateWalkingTime,
  formatDistance,
  formatWalkingTime,
} from "@/lib/utils/distance";
import type {
  BusTrip,
  Departure,
  NearbyBusRealtimeResult,
  NearbyBusStopGroup,
  NearbyLocation,
  RealtimeSourceState,
  SubwayTrip,
  TransitStation,
  TransitVehicle,
} from "@/types/transit";

interface NearbyStationResponse extends TransitStation {
  distance: number;
}

interface NearbyRealtimeState {
  departures: Departure[];
  trips: SubwayTrip[];
  sourceState: RealtimeSourceState;
  lastUpdated: Date | null;
}

type ModeFilter = "all" | "subway" | "bus";

const REFRESH_INTERVAL_MS = 30_000;
const MAX_BUS_STOP_IDS = 12;

function hydrateDeparture(departure: Departure & { predictedArrival: Date | string; predictedDeparture: Date | string | null }): Departure {
  return {
    ...departure,
    predictedArrival: new Date(departure.predictedArrival),
    predictedDeparture: departure.predictedDeparture
      ? new Date(departure.predictedDeparture)
      : null,
  };
}

function mergeRealtimePayloads(payloads: Array<{ departures: Departure[]; trips: SubwayTrip[]; sourceState: RealtimeSourceState; lastUpdated: string }>): NearbyRealtimeState {
  const departures = sortUniqueDepartures(payloads.flatMap((payload) =>
    payload.departures.map((departure) => hydrateDeparture(departure))));
  const trips = [...new Map(payloads.flatMap((payload) => payload.trips).map((trip) => [trip.id, trip])).values()];
  const sourceState = payloads.some((payload) => payload.sourceState === "ok")
    ? payloads.some((payload) => payload.sourceState === "stale") ? "stale" : "ok"
    : payloads[0]?.sourceState ?? "unavailable";
  return {
    departures,
    trips,
    sourceState,
    lastUpdated: payloads.length
      ? new Date(Math.max(...payloads.map((payload) => new Date(payload.lastUpdated).getTime())))
      : null,
  };
}

function LocationState({ permissionState, isLoading, onRequest, error }: { permissionState: string; isLoading: boolean; onRequest: () => void; error: string | null }) {
  const title = permissionState === "denied" ? "Location access is off" : permissionState === "unsupported" ? "Location is not supported" : "Find transit near you";
  const description = permissionState === "denied" ? "Enable location in your browser settings, then try again." : error ?? "Use your current location to rank nearby subway stations and bus stops.";
  return <EmptyState icon={<LocateFixed className="h-6 w-6" aria-hidden="true" />} title={title} description={description} action={permissionState !== "unsupported" && <Button color="primary" variant="flat" onPress={onRequest} isLoading={isLoading} startContent={<LocateFixed className="h-4 w-4" />}>{permissionState === "denied" ? "Try location again" : "Use my location"}</Button>} />;
}

function combineBusResults(results: readonly NearbyBusRealtimeResult[], stopGroup: NearbyBusStopGroup): Departure[] {
  const stopIds = new Set(stopGroup.stops.map((stop) => stop.id));
  return sortUniqueDepartures(results
    .filter((result) => stopIds.has(result.stopId))
    .flatMap((result) => result.departures));
}

export function NearbyClient() {
  const { position, error: geoError, isLoading: isLoadingGeo, permissionState, requestLocation } = useGeolocation({ autoRequest: true });
  const [stations, setStations] = useState<NearbyStationResponse[]>([]);
  const [busGroups, setBusGroups] = useState<NearbyBusStopGroup[]>([]);
  const [busResults, setBusResults] = useState<NearbyBusRealtimeResult[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [subwayRealtime, setSubwayRealtime] = useState<NearbyRealtimeState | null>(null);
  const [isLoadingSubway, setIsLoadingSubway] = useState(false);
  const [isLoadingBuses, setIsLoadingBuses] = useState(false);
  const [subwayError, setSubwayError] = useState<string | null>(null);
  const [busError, setBusError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ModeFilter>("all");
  const [expandedBusGroups, setExpandedBusGroups] = useState<Set<string>>(new Set());
  const [directionIndex, setDirectionIndex] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const directionRailRef = useRef<HTMLDivElement>(null);

  const loadStations = useCallback(async () => {
    if (!position) return;
    setIsLoadingSubway(true);
    setSubwayError(null);
    try {
      const response = await fetch(`/api/stations?near=${position.latitude},${position.longitude}&radius=1.5&limit=5`);
      const json = await response.json() as { success: boolean; data?: { stations: NearbyStationResponse[] }; error?: string };
      if (!response.ok || !json.success) throw new Error(json.error ?? "Nearby subway stations could not be loaded.");
      const nextStations = json.data?.stations ?? [];
      setStations(nextStations);
      setSelectedStationId((current) => current && nextStations.some((station) => station.id === current) ? current : nextStations[0]?.id ?? null);
    } catch (cause) {
      setSubwayError(cause instanceof Error ? cause.message : "Nearby subway stations could not be loaded.");
    } finally {
      setIsLoadingSubway(false);
    }
  }, [position]);

  const loadBusGroups = useCallback(async () => {
    if (!position) return;
    setIsLoadingBuses(true);
    setBusError(null);
    try {
      const response = await fetch(`/api/buses/stops?near=${position.latitude},${position.longitude}&radius=0.75&limit=6`);
      const json = await response.json() as { success: boolean; data?: { groups: NearbyBusStopGroup[] }; error?: string };
      if (!response.ok || !json.success) throw new Error(json.error ?? "Nearby bus stops could not be loaded.");
      setBusGroups(json.data?.groups ?? []);
    } catch (cause) {
      setBusError(cause instanceof Error ? cause.message : "Nearby bus stops could not be loaded.");
    } finally {
      setIsLoadingBuses(false);
    }
  }, [position]);

  useEffect(() => { void loadStations(); void loadBusGroups(); }, [loadBusGroups, loadStations]);

  const selectedStation = useMemo(() => stations.find((station) => station.id === selectedStationId) ?? null, [selectedStationId, stations]);
  const busStopIds = useMemo(() => [...new Set(busGroups.flatMap((group) => group.stops.map((stop) => stop.id)))].slice(0, MAX_BUS_STOP_IDS), [busGroups]);

  const loadSubwayRealtime = useCallback(async () => {
    if (!selectedStation) return;
    try {
      const sourceIds = selectedStation.sourceIds?.length ? selectedStation.sourceIds : [selectedStation.id];
      const payloads = await Promise.all(sourceIds.map((sourceId) => fetch(`/api/trains/realtime?stationId=${encodeURIComponent(sourceId)}&limit=100`).then(async (response) => {
        const json = await response.json() as { success: boolean; data?: { departures: Departure[]; trips: SubwayTrip[]; sourceState: RealtimeSourceState; lastUpdated: string }; error?: string };
        if (!response.ok || !json.success || !json.data) throw new Error(json.error ?? "Realtime subway departures are unavailable.");
        return json.data;
      })));
      setSubwayRealtime(mergeRealtimePayloads(payloads));
    } catch (cause) {
      setSubwayRealtime({ departures: [], trips: [], sourceState: "unavailable", lastUpdated: null });
      setSubwayError(cause instanceof Error ? cause.message : "Realtime subway departures are unavailable.");
    }
  }, [selectedStation]);

  const loadBusRealtime = useCallback(async () => {
    if (busStopIds.length === 0) return;
    try {
      const query = new URLSearchParams();
      busStopIds.forEach((stopId) => query.append("stopId", stopId));
      const response = await fetch(`/api/buses/nearby?${query}`);
      const json = await response.json() as { success: boolean; data?: { results: Array<Omit<NearbyBusRealtimeResult, "departures" | "trips" | "vehicles" | "feedTimestamp"> & { departures: Departure[]; trips: BusTrip[]; vehicles: TransitVehicle[]; feedTimestamp: string | null }> }; error?: string };
      if (!response.ok || !json.success || !json.data) throw new Error(json.error ?? "Realtime bus arrivals are unavailable.");
      setBusResults(json.data.results.map((result) => ({
        ...result,
        departures: result.departures.map((departure) => hydrateDeparture(departure)),
        feedTimestamp: result.feedTimestamp ? new Date(result.feedTimestamp) : null,
      })));
    } catch (cause) {
      setBusError(cause instanceof Error ? cause.message : "Realtime bus arrivals are unavailable.");
    }
  }, [busStopIds]);

  useEffect(() => {
    setDirectionIndex(0);
    setShowMore(false);
    setSubwayRealtime(null);
    void loadSubwayRealtime();
    if (!selectedStation) return;
    const interval = window.setInterval(() => void loadSubwayRealtime(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loadSubwayRealtime, selectedStation]);

  useEffect(() => {
    if (filter === "subway" || busStopIds.length === 0) return;
    void loadBusRealtime();
    const interval = window.setInterval(() => void loadBusRealtime(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [busStopIds.length, filter, loadBusRealtime]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  const locations = useMemo(() => sortNearbyLocations([
    ...stations.map((station): NearbyLocation => ({ id: `subway:${station.id}`, mode: "subway", station, distanceMiles: station.distance })),
    ...busGroups.map((stopGroup): NearbyLocation => ({ id: stopGroup.id, mode: "bus", stopGroup, distanceMiles: stopGroup.distanceMiles })),
  ]).filter((location) => filter === "all" || location.mode === filter), [busGroups, filter, stations]);

  const directionGroups = useMemo(() => groupDeparturesByDirection(subwayRealtime?.departures ?? []), [subwayRealtime?.departures]);
  const directions = useMemo(() => {
    const fromStation = selectedStation?.stops.map((stop) => stop.direction).filter((direction) => direction !== "unknown") ?? [];
    return [...new Set([...directionGroups.map((group) => group.direction), ...fromStation])];
  }, [directionGroups, selectedStation]);

  if (!position) return <LocationState permissionState={permissionState} isLoading={isLoadingGeo} onRequest={requestLocation} error={geoError?.message ?? null} />;
  if (isLoadingSubway && isLoadingBuses && locations.length === 0) return <LoadingSkeleton variant="card" count={4} />;
  if (locations.length === 0 && subwayError && busError) return <ErrorState title="Nearby transit could not load" description="Subway and bus results are temporarily unavailable." onRetry={() => { void loadStations(); void loadBusGroups(); }} />;

  return <div className="space-y-6 pb-24 lg:pb-8">
    <Surface className="flex items-center justify-between gap-4 px-4 py-3" elevation="panel">
      <div className="flex min-w-0 items-center gap-3"><LocateFixed className="h-5 w-5 shrink-0 text-state-selected" aria-hidden="true" /><div className="min-w-0"><p className="text-sm font-semibold">Near you</p><p className="truncate text-xs text-foreground/60">Subway and bus · ranked by walking proximity</p></div></div>
      <Button isIconOnly size="sm" variant="light" aria-label="Refresh current location" onPress={requestLocation} isLoading={isLoadingGeo}><RefreshCw className="h-4 w-4" /></Button>
    </Surface>

    <div className="flex gap-2" role="group" aria-label="Transit mode filter">
      {(["all", "subway", "bus"] as const).map((mode) => <button key={mode} type="button" aria-pressed={filter === mode} onClick={() => setFilter(mode)} className={`min-h-11 rounded-pill border px-4 text-sm font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${filter === mode ? "border-state-selected bg-surface-selected" : "border-border-subtle bg-surface-panel"}`}>{mode}</button>)}
    </div>

    <div className="grid gap-6 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)]">
      <section aria-labelledby="nearby-locations-heading">
        <div className="mb-3"><h2 id="nearby-locations-heading" className="text-lg font-semibold">Nearby transit</h2><p className="text-sm text-foreground/60">Closest practical boarding locations first</p></div>
        <div className="space-y-3">
          {subwayError && stations.length === 0 && <p role="status" className="rounded-md border border-state-advisory/40 bg-state-advisory/10 p-3 text-sm">Subway locations unavailable. Bus results are still available.</p>}
          {busError && busGroups.length === 0 && <p role="status" className="rounded-md border border-state-advisory/40 bg-state-advisory/10 p-3 text-sm">Bus locations unavailable. Subway results are still available.</p>}
          {locations.map((location, index) => location.mode === "subway" ? <NearbyLocationCard key={location.id} selected={location.station.id === selectedStationId} onSelect={() => setSelectedStationId(location.station.id)} label={`Select ${location.station.name} subway station`}>
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="mt-0.5 text-xs font-semibold text-foreground/45">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="flex items-center gap-2 font-semibold"><TrainFront className="h-4 w-4" aria-hidden="true" />{location.station.name}</span><span className="mt-1 block text-sm text-foreground/60">{formatDistance(location.distanceMiles)} · {formatWalkingTime(estimateWalkingTime(location.distanceMiles))}</span></span></div><MapPin className="h-4 w-4 shrink-0 text-foreground/45" aria-hidden="true" /></div>
            <span className="mt-3 flex flex-wrap gap-1.5">{location.station.routeIds.slice(0, 8).map((route) => <SubwayBullet key={route} line={route} size="xs" />)}</span>
          </NearbyLocationCard> : (() => {
            const departures = combineBusResults(busResults, location.stopGroup);
            const next = selectNextDeparture(departures, now);
            const expanded = expandedBusGroups.has(location.id);
            const states = busResults.filter((result) => location.stopGroup.stops.some((stop) => stop.id === result.stopId)).map((result) => result.sourceState);
            return <NearbyLocationCard key={location.id}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="flex items-center gap-2 font-semibold"><BusFront className="h-4 w-4" aria-hidden="true" />{location.stopGroup.name}</span><span className="mt-1 block text-sm text-foreground/60">{formatDistance(location.distanceMiles)} · {formatWalkingTime(estimateWalkingTime(location.distanceMiles))}</span></div><span className="text-xs font-semibold text-foreground/45">{String(index + 1).padStart(2, "0")}</span></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{location.stopGroup.routeIds.slice(0, 10).map((route) => <BusBadge key={route} route={route} size="xs" />)}</div>
              <div className="mt-3 space-y-2">{next ? <BusDepartureCard departure={next} now={now} hero /> : <p className="rounded-md bg-surface-app px-3 py-2 text-sm text-foreground/60">{states.some((state) => state === "unavailable") ? "Live bus arrivals are temporarily unavailable." : "No upcoming buses are reporting here."}</p>}
                {expanded && departures.filter((departure) => departure.tripId !== next?.tripId).slice(0, 5).map((departure) => <BusDepartureCard key={departure.tripId} departure={departure} now={now} />)}
                {departures.length > 1 && <button type="button" aria-expanded={expanded} onClick={() => setExpandedBusGroups((current) => { const nextSet = new Set(current); if (nextSet.has(location.id)) nextSet.delete(location.id); else nextSet.add(location.id); return nextSet; })} className="flex min-h-11 w-full items-center justify-center gap-1 rounded-md text-sm font-medium text-state-selected hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{expanded ? "Show fewer buses" : `Show ${Math.min(5, departures.length - 1)} more buses`}<ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /></button>}
              </div>
            </NearbyLocationCard>;
          })())}
          {locations.length === 0 && <EmptyState title={`No ${filter === "all" ? "transit" : filter} nearby`} description="Try refreshing your location or choosing another mode." />}
        </div>
      </section>

      {filter !== "bus" && selectedStation && <section aria-labelledby="station-heading" className="min-w-0">
        <div className="mb-4 flex items-start justify-between gap-4"><div className="min-w-0"><h2 id="station-heading" className="truncate text-xl font-semibold">{selectedStation.name}</h2><p className="mt-1 text-sm text-foreground/60">Choose a direction to see the next train.</p></div>{subwayRealtime && <StatusChip state={subwayRealtime.sourceState === "ok" ? "normal" : subwayRealtime.sourceState === "stale" ? "stale" : "unavailable"} label={getFreshnessLabel(subwayRealtime.sourceState)} size="sm" />}</div>
        {directions.length > 0 && <div className="mb-4 flex gap-2 overflow-x-auto" role="tablist" aria-label="Train directions">{directions.map((direction, index) => <button key={direction} type="button" role="tab" aria-selected={index === directionIndex} onClick={() => { setDirectionIndex(index); directionRailRef.current?.children[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" }); }} className={`min-h-11 shrink-0 rounded-pill border px-3 text-sm font-medium ${index === directionIndex ? "border-state-selected bg-surface-selected" : "border-border-subtle text-foreground/65"}`}>{getRiderDirectionLabel(direction)}</button>)}</div>}
        <div ref={directionRailRef} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-none" onScroll={(event) => { const element = event.currentTarget; const index = Math.round(element.scrollLeft / Math.max(element.clientWidth, 1)); setDirectionIndex(Math.min(index, Math.max(0, directions.length - 1))); }}>
          {directions.map((direction) => { const departures = sortUniqueDepartures(subwayRealtime?.departures.filter((departure) => departure.direction === direction) ?? []); const next = selectNextDeparture(departures, now); return <div key={direction} role="tabpanel" className="w-full shrink-0 snap-start pr-1"><div className="mb-3"><p className="text-sm font-medium">{getRiderDirectionLabel(direction, next?.destination)}</p><p className="text-xs text-foreground/55">{getDirectionLabel(direction)} · {departures.length} upcoming</p></div>{next ? <div className="space-y-3"><TrainDepartureCard departure={next} now={now} hero />{showMore && departures.filter((departure) => departure.tripId !== next.tripId).slice(0, 5).map((departure) => <TrainDepartureCard key={departure.tripId} departure={departure} now={now} />)}{departures.length > 1 && <button type="button" className="min-h-11 w-full rounded-lg py-2 text-sm font-medium text-state-selected hover:bg-surface-hover" onClick={() => setShowMore((value) => !value)}>{showMore ? "Show less" : `Show ${Math.min(5, departures.length - 1)} more departures`}</button>}</div> : <EmptyState title="No upcoming trains" description={subwayError ?? "There are no current predictions for this direction."} action={<Button variant="flat" onPress={loadSubwayRealtime}>Refresh departures</Button>} />}</div>; })}
        </div>
      </section>}
    </div>
  </div>;
}
