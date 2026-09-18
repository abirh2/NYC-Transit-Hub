"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { LocateFixed, MapPin, RefreshCw } from "lucide-react";
import { ErrorState, EmptyState, LoadingSkeleton, StatusChip, SubwayBullet, Surface } from "@/components/ui";
import { TrainDepartureCard } from "@/components/nearby/TrainDepartureCard";
import { useGeolocation } from "@/lib/hooks";
import { estimateWalkingTime, formatDistance, formatWalkingTime } from "@/lib/utils/distance";
import { getDirectionLabel } from "@/lib/transit/direction";
import {
  getFreshnessLabel,
  getRiderDirectionLabel,
  groupDeparturesByDirection,
  selectNextDeparture,
  sortUniqueDepartures,
} from "@/lib/transit/nearby";
import type { Departure, RealtimeSourceState, TransitStation, SubwayTrip } from "@/types/transit";

interface NearbyStationResponse extends TransitStation {
  distance: number;
}

interface NearbyRealtimeState {
  departures: Departure[];
  trips: SubwayTrip[];
  sourceState: RealtimeSourceState;
  lastUpdated: Date | null;
}

const REFRESH_INTERVAL_MS = 30_000;

function parseStation(station: Record<string, unknown>): NearbyStationResponse {
  return station as unknown as NearbyStationResponse;
}

function mergeRealtimePayloads(payloads: Array<{ departures: Departure[]; trips: SubwayTrip[]; sourceState: RealtimeSourceState; lastUpdated: string }>): NearbyRealtimeState {
  const departures = sortUniqueDepartures(payloads.flatMap((payload) => payload.departures));
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
  const title = permissionState === "denied" ? "Location access is off" : permissionState === "unsupported" ? "Location is not supported" : "Find subway stations near you";
  const description = permissionState === "denied" ? "Enable location in your browser settings, then try again." : error ?? "Use your current location to rank nearby subway station complexes.";

  return (
    <EmptyState
      icon={<LocateFixed className="h-6 w-6" aria-hidden="true" />}
      title={title}
      description={description}
      action={permissionState !== "unsupported" && (
        <Button color="primary" variant="flat" onPress={onRequest} isLoading={isLoading} startContent={<LocateFixed className="h-4 w-4" />}>
          {permissionState === "denied" ? "Try location again" : "Use my location"}
        </Button>
      )}
    />
  );
}

export function NearbyClient() {
  const { position, error: geoError, isLoading: isLoadingGeo, permissionState, requestLocation } = useGeolocation({ autoRequest: true });
  const [stations, setStations] = useState<NearbyStationResponse[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [realtime, setRealtime] = useState<NearbyRealtimeState | null>(null);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isLoadingRealtime, setIsLoadingRealtime] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directionIndex, setDirectionIndex] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const directionRailRef = useRef<HTMLDivElement>(null);

  const loadStations = useCallback(async () => {
    if (!position) return;
    setIsLoadingStations(true);
    setError(null);
    try {
      const response = await fetch(`/api/stations?near=${position.latitude},${position.longitude}&radius=1.5&limit=5`);
      const json = await response.json() as { success: boolean; data?: { stations: Record<string, unknown>[] }; error?: string };
      if (!response.ok || !json.success) throw new Error(json.error ?? "Nearby stations could not be loaded.");
      const nextStations = (json.data?.stations ?? []).map(parseStation);
      setStations(nextStations);
      setSelectedStationId((current) => current && nextStations.some((station) => station.id === current) ? current : nextStations[0]?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nearby stations could not be loaded.");
    } finally {
      setIsLoadingStations(false);
    }
  }, [position]);

  useEffect(() => { void loadStations(); }, [loadStations]);

  const selectedStation = useMemo(() => stations.find((station) => station.id === selectedStationId) ?? null, [selectedStationId, stations]);

  const loadRealtime = useCallback(async () => {
    if (!selectedStation) return;
    setIsLoadingRealtime(true);
    try {
      const sourceIds = selectedStation.sourceIds?.length ? selectedStation.sourceIds : [selectedStation.id];
      const responses = await Promise.all(sourceIds.map((sourceId) => fetch(`/api/trains/realtime?stationId=${encodeURIComponent(sourceId)}&limit=100`).then(async (response) => {
        const json = await response.json() as { success: boolean; data?: { departures: Departure[]; trips: SubwayTrip[]; sourceState: RealtimeSourceState; lastUpdated: string }; error?: string };
        if (!response.ok || !json.success || !json.data) throw new Error(json.error ?? "Realtime departures are unavailable.");
        return json.data;
      })));
      setRealtime(mergeRealtimePayloads(responses));
    } catch (cause) {
      setRealtime({ departures: [], trips: [], sourceState: "unavailable", lastUpdated: null });
      setError(cause instanceof Error ? cause.message : "Realtime departures are unavailable.");
    } finally {
      setIsLoadingRealtime(false);
    }
  }, [selectedStation]);

  useEffect(() => {
    setDirectionIndex(0);
    setShowMore(false);
    setRealtime(null);
    void loadRealtime();
    const interval = window.setInterval(() => void loadRealtime(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loadRealtime]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const directionGroups = useMemo(() => groupDeparturesByDirection(realtime?.departures ?? []), [realtime?.departures]);
  const directions = useMemo(() => {
    const fromStation = selectedStation?.stops.map((stop) => stop.direction).filter((direction) => direction !== "unknown") ?? [];
    return [...new Set([...directionGroups.map((group) => group.direction), ...fromStation])];
  }, [directionGroups, selectedStation]);
  if (!position) {
    return <LocationState permissionState={permissionState} isLoading={isLoadingGeo} onRequest={requestLocation} error={geoError?.message ?? null} />;
  }

  if (isLoadingStations) {
    return <LoadingSkeleton variant="card" count={3} />;
  }

  if (error && stations.length === 0) {
    return <ErrorState title="Nearby stations could not load" description={error} onRetry={requestLocation} />;
  }

  if (stations.length === 0) {
    return <EmptyState icon={<MapPin className="h-6 w-6" />} title="No subway stations nearby" description="Try refreshing your location or widening your search area." action={<Button variant="flat" onPress={requestLocation} startContent={<RefreshCw className="h-4 w-4" />}>Refresh location</Button>} />;
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <Surface className="flex items-center justify-between gap-4 px-4 py-3" elevation="panel">
        <div className="flex min-w-0 items-center gap-3">
          <LocateFixed className="h-5 w-5 shrink-0 text-state-selected" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Near you</p>
            <p className="truncate text-xs text-foreground/60">Current location · updated just now</p>
          </div>
        </div>
        <Button isIconOnly size="sm" variant="light" aria-label="Refresh current location" onPress={requestLocation} isLoading={isLoadingGeo}><RefreshCw className="h-4 w-4" /></Button>
      </Surface>

      <div className="grid gap-6 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)]">
        <section aria-labelledby="nearby-stations-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 id="nearby-stations-heading" className="text-lg font-semibold">Nearby subway</h2><p className="text-sm text-foreground/60">Ranked by straight-line distance</p></div>
          </div>
          <div className="space-y-2">
            {stations.map((station, index) => {
              const selected = station.id === selectedStationId;
              return <button key={station.id} type="button" onClick={() => setSelectedStationId(station.id)} aria-pressed={selected} className={`w-full rounded-lg border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-focus ${selected ? "border-state-selected bg-surface-selected" : "border-border-subtle bg-surface-panel hover:bg-surface-hover"}`}>
                <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="mt-0.5 text-xs font-semibold text-foreground/45">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block font-semibold">{station.name}</span><span className="mt-1 block text-sm text-foreground/60">{formatDistance(station.distance)} · {formatWalkingTime(estimateWalkingTime(station.distance))}</span></span></div><MapPin className="h-4 w-4 shrink-0 text-foreground/45" aria-hidden="true" /></div>
                <span className="mt-3 flex flex-wrap gap-1.5">{(station.routeIds ?? []).slice(0, 8).map((route) => <SubwayBullet key={route} line={route} size="xs" />)}</span>
              </button>;
            })}
          </div>
        </section>

        {selectedStation && <section aria-labelledby="station-heading" className="min-w-0">
          <div className="mb-4 flex items-start justify-between gap-4"><div className="min-w-0"><h2 id="station-heading" className="truncate text-xl font-semibold">{selectedStation.name}</h2><p className="mt-1 text-sm text-foreground/60">Choose a direction to see the next train.</p></div>{realtime && <StatusChip state={realtime.sourceState === "ok" ? "normal" : realtime.sourceState === "stale" ? "stale" : "unavailable"} label={getFreshnessLabel(realtime.sourceState)} size="sm" />}</div>

          {directions.length > 0 && <div className="mb-4"><div className="mb-2 flex items-center justify-between gap-3"><div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Train directions">{directions.map((direction, index) => <button key={direction} type="button" role="tab" aria-selected={index === directionIndex} onClick={() => { setDirectionIndex(index); directionRailRef.current?.children[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" }); }} className={`min-h-11 shrink-0 rounded-pill border px-3 text-sm font-medium ${index === directionIndex ? "border-state-selected bg-surface-selected text-foreground" : "border-border-subtle text-foreground/65"}`}>{getRiderDirectionLabel(direction)}</button>)}</div><span className="hidden text-xs text-foreground/45 sm:inline">Swipe directions</span></div></div>}

          <div ref={directionRailRef} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-none" onScroll={(event) => { const element = event.currentTarget; const index = Math.round(element.scrollLeft / Math.max(element.clientWidth, 1)); setDirectionIndex(Math.min(index, directions.length - 1)); }}>
            {directions.map((direction) => { const departures = sortUniqueDepartures(realtime?.departures.filter((departure) => departure.direction === direction) ?? []); const next = selectNextDeparture(departures, now); return <div key={direction} role="tabpanel" className="w-full shrink-0 snap-start pr-1" aria-label={getRiderDirectionLabel(direction)}>
              <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-medium">{getRiderDirectionLabel(direction, next?.destination)}</p><p className="text-xs text-foreground/55">{getDirectionLabel(direction)} · {departures.length} upcoming</p></div>{isLoadingRealtime && <span className="text-xs text-foreground/55">Updating…</span>}</div>
              {next ? <div className="space-y-3"><TrainDepartureCard departure={next} now={now} hero />{showMore && departures.filter((departure) => departure.tripId !== next.tripId).slice(0, 5).map((departure) => <TrainDepartureCard key={departure.tripId} departure={departure} now={now} />)}<button type="button" className="w-full rounded-lg py-2 text-sm font-medium text-state-selected hover:bg-surface-hover" onClick={() => setShowMore((value) => !value)}>{showMore ? "Show less" : `Show ${Math.max(0, Math.min(5, departures.length - 1))} more departures`}</button></div> : <EmptyState title="No upcoming trains" description={realtime?.sourceState === "stale" ? "Realtime data is stale. Station information is still available; try again shortly." : "There are no current predictions for this direction."} action={<Button variant="flat" onPress={loadRealtime} isLoading={isLoadingRealtime}>Refresh departures</Button>} />}
            </div>; })}
          </div>
        </section>}
      </div>
    </div>
  );
}
