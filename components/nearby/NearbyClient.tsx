"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { LocateFixed } from "lucide-react";

import { NearbyDepartureRow } from "@/components/nearby/NearbyDepartureRow";
import { NearbyMap } from "@/components/nearby/NearbyMap";
import { NearbySubwayServicePanel } from "@/components/nearby/NearbySubwayServicePanel";
import { EmptyState, StatusChip } from "@/components/ui";
import { useGeolocation } from "@/lib/hooks";
import {
  buildNearbyServices,
  sortUniqueDepartures,
  type NearbyService,
} from "@/lib/transit/nearby";
import type {
  BusTrip,
  Departure,
  NearbyBusRealtimeResult,
  NearbyBusStopGroup,
  RealtimeSourceState,
  SubwayTrip,
  TransitStation,
  TransitVehicle,
} from "@/types/transit";
import type { NearbySearchOrigin } from "@/types/location";

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
const DEFAULT_MAP_ORIGIN: NearbySearchOrigin = {
  latitude: 40.758,
  longitude: -73.9855,
  label: "New York City",
  source: "map",
};

function hydrateDeparture(departure: Departure & {
  predictedArrival: Date | string;
  predictedDeparture: Date | string | null;
}): Departure {
  return {
    ...departure,
    predictedArrival: new Date(departure.predictedArrival),
    predictedDeparture: departure.predictedDeparture
      ? new Date(departure.predictedDeparture)
      : null,
  };
}

function mergeRealtimePayloads(payloads: Array<{
  departures: Departure[];
  trips: SubwayTrip[];
  sourceState: RealtimeSourceState;
  lastUpdated: string;
}>): NearbyRealtimeState {
  const departures = sortUniqueDepartures(payloads.flatMap((payload) =>
    payload.departures.map((departure) => hydrateDeparture(departure))));
  const trips = [...new Map(payloads.flatMap((payload) => payload.trips)
    .map((trip) => [trip.id, trip])).values()];
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

function LocationState({
  permissionState,
  isLoading,
  onRequest,
  error,
}: {
  permissionState: string;
  isLoading: boolean;
  onRequest: () => void;
  error: string | null;
}) {
  const title = permissionState === "denied"
    ? "Location access is off"
    : permissionState === "unsupported"
      ? "Location is not supported"
      : "Find transit near you";
  const description = permissionState === "denied"
    ? "Allow location in your browser settings, or search and move the map above."
    : error ?? "Use your current location, or search and move the map above.";
  const retryAction = permissionState !== "unsupported" && (
    <Button
      color="primary"
      variant="solid"
      onPress={onRequest}
      isLoading={isLoading}
      startContent={<LocateFixed className="h-4 w-4" />}
    >
      {permissionState === "denied" ? "Try location again" : "Use my location"}
    </Button>
  );

  return (
    <EmptyState
      icon={<LocateFixed className="h-6 w-6" aria-hidden="true" />}
      title={title}
      description={description}
      headingLevel="h2"
      action={retryAction}
    />
  );
}

function ResultsSkeleton() {
  return (
    <div aria-label="Loading nearby departures" aria-busy="true" className="divide-y divide-border-subtle">
      {[0, 1, 2].map((index) => (
        <div key={index} className="grid min-h-24 grid-cols-[2.5rem_1fr_3.5rem] items-center gap-3 px-4 py-2.5">
          <span className="h-8 w-8 animate-pulse rounded-pill bg-surface-elevated motion-reduce:animate-none" />
          <span className="space-y-2">
            <span className="block h-3 w-2/5 animate-pulse rounded-sm bg-surface-elevated motion-reduce:animate-none" />
            <span className="block h-4 w-4/5 animate-pulse rounded-sm bg-surface-elevated motion-reduce:animate-none" />
            <span className="block h-3 w-3/5 animate-pulse rounded-sm bg-surface-elevated motion-reduce:animate-none" />
          </span>
          <span className="h-10 animate-pulse rounded-sm bg-surface-elevated motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export function NearbyClient() {
  const {
    position,
    error: geoError,
    isLoading: isLoadingGeo,
    permissionState,
    requestLocation,
  } = useGeolocation({ autoRequest: true });
  const [searchOriginOverride, setSearchOriginOverride] = useState<NearbySearchOrigin | null>(null);
  const [stations, setStations] = useState<NearbyStationResponse[]>([]);
  const [busGroups, setBusGroups] = useState<NearbyBusStopGroup[]>([]);
  const [busResults, setBusResults] = useState<NearbyBusRealtimeResult[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [expandedTrainTripId, setExpandedTrainTripId] = useState<string | null>(null);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null);
  const [subwayRealtime, setSubwayRealtime] = useState<NearbyRealtimeState | null>(null);
  const [isLoadingSubway, setIsLoadingSubway] = useState(false);
  const [isLoadingBuses, setIsLoadingBuses] = useState(false);
  const [subwayError, setSubwayError] = useState<string | null>(null);
  const [busError, setBusError] = useState<string | null>(null);
  const [subwayIsPartial, setSubwayIsPartial] = useState(false);
  const [busIsPartial, setBusIsPartial] = useState(false);
  const [filter, setFilter] = useState<ModeFilter>("all");
  const [now, setNow] = useState(() => new Date());

  const searchOrigin = useMemo<NearbySearchOrigin | null>(() => (
    searchOriginOverride ?? (position ? {
      latitude: position.latitude,
      longitude: position.longitude,
      label: "My location",
      source: "device",
    } : null)
  ), [position, searchOriginOverride]);

  const changeSearchOrigin = useCallback((origin: NearbySearchOrigin) => {
    setSearchOriginOverride(origin.source === "device" ? null : origin);
    setSelectedStationId(null);
    setSelectedServiceId(null);
    setExpandedTrainTripId(null);
    setPendingLocationId(null);
    setSubwayRealtime(null);
    setBusResults([]);
  }, []);

  const useCurrentLocation = useCallback(() => {
    setSearchOriginOverride(null);
    setSelectedServiceId(null);
    setExpandedTrainTripId(null);
    setPendingLocationId(null);
    requestLocation();
  }, [requestLocation]);

  const loadStations = useCallback(async () => {
    if (!searchOrigin) return;
    setIsLoadingSubway(true);
    setSubwayError(null);
    setSubwayIsPartial(false);
    try {
      const response = await fetch(`/api/stations?near=${searchOrigin.latitude},${searchOrigin.longitude}&radius=1.5&limit=5`);
      const json = await response.json() as {
        success: boolean;
        data?: { stations: NearbyStationResponse[] };
        error?: string;
      };
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "Nearby subway stations could not be loaded.");
      }
      const nextStations = json.data?.stations ?? [];
      setStations(nextStations);
      setSelectedStationId((current) =>
        current && nextStations.some((station) => station.id === current)
          ? current
          : nextStations[0]?.id ?? null);
    } catch (cause) {
      setSubwayIsPartial(false);
      setSubwayError(cause instanceof Error ? cause.message : "Nearby subway stations could not be loaded.");
    } finally {
      setIsLoadingSubway(false);
    }
  }, [searchOrigin]);

  const loadBusGroups = useCallback(async () => {
    if (!searchOrigin) return;
    setIsLoadingBuses(true);
    setBusError(null);
    setBusIsPartial(false);
    try {
      const response = await fetch(`/api/buses/stops?near=${searchOrigin.latitude},${searchOrigin.longitude}&radius=0.75&limit=6`);
      const json = await response.json() as {
        success: boolean;
        data?: { groups: NearbyBusStopGroup[] };
        error?: string;
      };
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "Nearby bus stops could not be loaded.");
      }
      setBusGroups(json.data?.groups ?? []);
    } catch (cause) {
      setBusIsPartial(false);
      setBusError(cause instanceof Error ? cause.message : "Nearby bus stops could not be loaded.");
    } finally {
      setIsLoadingBuses(false);
    }
  }, [searchOrigin]);

  useEffect(() => {
    void loadStations();
    void loadBusGroups();
  }, [loadBusGroups, loadStations]);

  const selectedStation = useMemo(() =>
    stations.find((station) => station.id === selectedStationId) ?? null,
  [selectedStationId, stations]);
  const busStopIds = useMemo(() => [
    ...new Set(busGroups.flatMap((group) => group.stops.map((stop) => stop.id))),
  ].slice(0, MAX_BUS_STOP_IDS), [busGroups]);

  const loadSubwayRealtime = useCallback(async () => {
    if (!selectedStation) return;
    try {
      const sourceIds = selectedStation.sourceIds?.length
        ? selectedStation.sourceIds
        : [selectedStation.id];
      const payloads = await Promise.all(sourceIds.map((sourceId) =>
        fetch(`/api/trains/realtime?stationId=${encodeURIComponent(sourceId)}&limit=100`)
          .then(async (response) => {
            const json = await response.json() as {
              success: boolean;
              data?: {
                departures: Departure[];
                trips: SubwayTrip[];
                sourceState: RealtimeSourceState;
                lastUpdated: string;
              };
              error?: string;
            };
            if (!response.ok || !json.success || !json.data) {
              throw new Error(json.error ?? "Realtime subway departures are unavailable.");
            }
            return json.data;
          })));
      const nextRealtime = mergeRealtimePayloads(payloads);
      const unavailablePayloads = payloads.filter((payload) =>
        payload.sourceState === "unavailable" || payload.sourceState === "malformed");
      const hasHealthyPayload = payloads.some((payload) =>
        payload.sourceState === "ok" || payload.sourceState === "stale" || payload.sourceState === "empty");
      setSubwayRealtime(nextRealtime);
      setSubwayIsPartial(unavailablePayloads.length > 0 && hasHealthyPayload);
      setSubwayError(unavailablePayloads.length > 0
        ? unavailablePayloads.length === payloads.length
          ? "Realtime subway departures are unavailable."
          : "Some subway realtime sources are unavailable."
        : null);
    } catch (cause) {
      setSubwayRealtime({ departures: [], trips: [], sourceState: "unavailable", lastUpdated: null });
      setSubwayIsPartial(false);
      setSubwayError(cause instanceof Error ? cause.message : "Realtime subway departures are unavailable.");
    }
  }, [selectedStation]);

  const loadBusRealtime = useCallback(async () => {
    if (busStopIds.length === 0) return;
    try {
      const query = new URLSearchParams();
      busStopIds.forEach((stopId) => query.append("stopId", stopId));
      const response = await fetch(`/api/buses/nearby?${query}`);
      const json = await response.json() as {
        success: boolean;
        data?: {
          results: Array<Omit<NearbyBusRealtimeResult,
            "departures" | "trips" | "vehicles" | "feedTimestamp"> & {
              departures: Departure[];
              trips: BusTrip[];
              vehicles: TransitVehicle[];
              feedTimestamp: string | null;
            }>;
        };
        error?: string;
      };
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error ?? "Realtime bus arrivals are unavailable.");
      }
      const nextResults = json.data.results.map((result) => ({
        ...result,
        departures: result.departures.map((departure) => hydrateDeparture(departure)),
        feedTimestamp: result.feedTimestamp ? new Date(result.feedTimestamp) : null,
      }));
      const unavailableResults = nextResults.filter((result) =>
        result.error || result.sourceState === "unavailable" || result.sourceState === "malformed");
      const hasHealthyResult = nextResults.some((result) =>
        result.sourceState === "ok" || result.sourceState === "stale" || result.sourceState === "empty");
      setBusResults(nextResults);
      setBusIsPartial(unavailableResults.length > 0 && hasHealthyResult);
      setBusError(unavailableResults.length > 0
        ? unavailableResults.length === nextResults.length
          ? "Realtime bus arrivals are unavailable."
          : "Some bus realtime sources are unavailable."
        : null);
    } catch (cause) {
      setBusIsPartial(false);
      setBusError(cause instanceof Error ? cause.message : "Realtime bus arrivals are unavailable.");
    }
  }, [busStopIds]);

  useEffect(() => {
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

  const allServices = useMemo(() => buildNearbyServices({
    station: selectedStation,
    subwayDepartures: subwayRealtime?.departures ?? [],
    subwaySourceState: subwayRealtime?.sourceState ?? "empty",
    busGroups,
    busResults,
    now,
  }), [busGroups, busResults, now, selectedStation, subwayRealtime]);
  const visibleServices = useMemo(() => allServices.filter((service) =>
    filter === "all" || service.mode === filter), [allServices, filter]);
  const selectedService = useMemo(() =>
    allServices.find((service) => service.id === selectedServiceId) ?? null,
  [allServices, selectedServiceId]);
  const visibleBusServices = useMemo(() => visibleServices.filter(
    (service) => service.mode === "bus",
  ), [visibleServices]);

  useEffect(() => {
    const currentVisible = visibleServices.find((service) => service.id === selectedServiceId);
    const next = pendingLocationId
      ? visibleServices.find((service) => service.locationId === pendingLocationId)
      : currentVisible;
    if (!next) return;
    if (next.id !== selectedServiceId) setSelectedServiceId(next.id);
    if (pendingLocationId) {
      setPendingLocationId(null);
      window.requestAnimationFrame(() => {
        document.getElementById(`nearby-service-${encodeURIComponent(next.id)}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [pendingLocationId, selectedServiceId, visibleServices]);

  const selectLocation = useCallback((locationId: string) => {
    setPendingLocationId(locationId);
    setExpandedTrainTripId(null);
    if (locationId.startsWith("subway:")) {
      setSelectedStationId(locationId.slice("subway:".length));
    }
  }, []);

  useEffect(() => {
    setExpandedTrainTripId(null);
  }, [selectedStationId]);

  const selectSubwayDeparture = useCallback((departure: Departure) => {
    const service = allServices.find((candidate) =>
      candidate.mode === "subway" &&
      candidate.relatedDepartures.some((related) => related.tripId === departure.tripId));
    if (!service) return;

    setSelectedServiceId(service.id);
    setExpandedTrainTripId(departure.tripId);
  }, [allServices]);

  const selectedState = selectedService?.sourceState ?? subwayRealtime?.sourceState ?? "empty";
  const activeError = filter === "subway"
    ? subwayError
    : filter === "bus"
      ? busError
      : subwayError ?? busError;
  const isPartialFailure = Boolean(activeError) && (
    filter === "subway"
      ? subwayIsPartial
      : filter === "bus"
        ? busIsPartial
        : subwayIsPartial || busIsPartial || !subwayError || !busError
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(24rem,1.15fr)_minmax(22rem,0.85fr)] lg:gap-6">
      <h1 className="sr-only">Nearby transit</h1>

      <NearbyMap
        userPosition={position}
        searchOrigin={searchOrigin ?? DEFAULT_MAP_ORIGIN}
        stations={stations}
        busGroups={busGroups}
        selectedService={selectedService}
        subwayTrips={subwayRealtime?.trips ?? []}
        busResults={busResults}
        expanded={expandedTrainTripId !== null}
        onCollapse={() => setExpandedTrainTripId(null)}
        onSelectLocation={selectLocation}
        onSearchOriginChange={changeSearchOrigin}
        onUseCurrentLocation={useCurrentLocation}
      />

      <section aria-labelledby="nearby-departures-heading" className="min-w-0 bg-surface-panel lg:rounded-lg lg:border lg:border-border-subtle">
        <div className={`${expandedTrainTripId ? "hidden lg:flex" : "flex"} min-h-14 items-center gap-3 border-b border-border-subtle px-4 py-2`}>
          <div className="min-w-0 flex-1">
            <h2 id="nearby-departures-heading" className="truncate text-base font-semibold">
              {!searchOrigin
                ? "Choose an area"
                : filter === "bus" ? "Nearby buses" : selectedStation?.name ?? "Nearby departures"}
            </h2>
            <p className="truncate text-xs text-foreground/55">
              {searchOrigin?.label ?? "Search or move the map"}
            </p>
          </div>

          {searchOrigin && (
            <StatusChip
              state={activeError ? "unavailable" : selectedState === "ok" ? "normal" : selectedState === "stale" ? "stale" : "unavailable"}
              label={activeError ? isPartialFailure ? "Partial" : "Offline" : selectedState === "ok" ? "Live" : selectedState === "stale" ? "Delayed" : "Checking"}
              size="sm"
            />
          )}

          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label="Update current location"
            onPress={useCurrentLocation}
            isLoading={isLoadingGeo}
          >
            <LocateFixed className="h-4 w-4" />
          </Button>
        </div>

        {searchOrigin && <div className={`${expandedTrainTripId ? "hidden lg:flex" : "flex"} border-b border-border-subtle px-4`}>
          <div className="grid w-full grid-cols-3" role="group" aria-label="Transit mode filter">
            {(["all", "subway", "bus"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={filter === mode}
                onClick={() => setFilter(mode)}
                className={`min-h-11 border-b-2 px-3 text-xs font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset ${
                  filter === mode
                    ? "border-foreground text-foreground"
                    : "border-transparent text-foreground/50 hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>}

        {subwayError && (
          <p role="status" className="border-b border-border-subtle px-4 py-2 text-xs text-foreground/70">
            Subway updates are unavailable. Bus results remain available when reported.
          </p>
        )}
        {busError && (
          <p role="status" className="border-b border-border-subtle px-4 py-2 text-xs text-foreground/70">
            Bus updates are unavailable. Subway results remain available when reported.
          </p>
        )}

        {filter !== "bus" && selectedStation && subwayRealtime && (
          <NearbySubwayServicePanel
            key={selectedStation.id}
            stationName={selectedStation.name}
            departures={subwayRealtime.departures}
            now={now}
            selectedTripId={expandedTrainTripId}
            onSelectDeparture={selectSubwayDeparture}
          />
        )}

        {!searchOrigin ? (
          <div className="px-4 py-8">
            <LocationState
              permissionState={permissionState}
              isLoading={isLoadingGeo}
              onRequest={useCurrentLocation}
              error={geoError?.message ?? null}
            />
          </div>
        ) : (isLoadingSubway || isLoadingBuses) && visibleServices.length === 0 ? (
          <ResultsSkeleton />
        ) : visibleBusServices.length > 0 ? (
          <div>
            {visibleBusServices.map((service) => (
              <NearbyDepartureRow
                key={service.id}
                service={service}
                now={now}
                selected={service.id === selectedService?.id}
                onSelect={(nextService: NearbyService) => {
                  setExpandedTrainTripId(null);
                  setSelectedServiceId(nextService.id);
                }}
              />
            ))}
          </div>
        ) : filter === "bus" || !subwayRealtime?.departures.length ? (
          <div className="px-4 py-8">
            <EmptyState
              title={`No ${filter === "all" ? "departures" : `${filter} departures`} nearby`}
              description={subwayError ?? busError ?? "No current predictions are reporting. Try refreshing shortly."}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
