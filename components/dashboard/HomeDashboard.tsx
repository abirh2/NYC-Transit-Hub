"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HomeSections } from "@/components/dashboard/HomeSections";
import type {
  HomeCommuteSummary,
  SavedStationSnapshot,
} from "@/components/dashboard/home-types";
import { useGeolocation, useStationPreferences, useVisiblePolling } from "@/lib/hooks";
import {
  deriveRouteStatuses,
  extractCommuteRouteIds,
  hydrateDeparture,
  prioritizeHomeAlerts,
} from "@/lib/transit/dashboard-home";
import {
  buildNearbyServices,
  sortUniqueDepartures,
  type NearbyService,
} from "@/lib/transit/nearby";
import type {
  Departure,
  NearbyBusRealtimeResult,
  NearbyBusStopGroup,
  RealtimeSourceState,
  ServiceAlert,
  TransitStation,
} from "@/types/transit";

interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

interface StationApiRecord {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance?: number;
  allIds?: string[];
  sourceIds?: string[];
  routeIds?: string[];
  stops?: TransitStation["stops"];
}

interface TrainRealtimePayload {
  departures: Array<Omit<Departure, "predictedArrival" | "predictedDeparture"> & {
    predictedArrival: Date | string;
    predictedDeparture: Date | string | null;
  }>;
  sourceState: RealtimeSourceState;
}

interface BusRealtimePayload {
  results: Array<Omit<NearbyBusRealtimeResult, "departures" | "feedTimestamp"> & {
    departures: TrainRealtimePayload["departures"];
    feedTimestamp: string | null;
  }>;
}

interface AlertsPayload {
  alerts: Array<Omit<ServiceAlert, "activePeriodStart" | "activePeriodEnd"> & {
    activePeriodStart: Date | string | null;
    activePeriodEnd: Date | string | null;
  }>;
}

const REALTIME_REFRESH_MS = 30_000;
const CONTEXT_REFRESH_MS = 60_000;
const MAX_NEARBY_BUS_STOP_IDS = 12;

function toTransitStation(station: StationApiRecord): TransitStation & { distance: number } {
  return {
    id: station.id,
    sourceIds: station.sourceIds ?? station.allIds ?? [station.id],
    name: station.name,
    mode: "subway",
    location: {
      latitude: station.latitude,
      longitude: station.longitude,
    },
    stops: station.stops ?? [],
    routeIds: station.routeIds ?? [],
    distance: station.distance ?? 0,
  };
}

function mergeSourceState(states: readonly RealtimeSourceState[]): RealtimeSourceState {
  if (states.some((state) => state === "ok")) {
    return states.some((state) => state === "stale") ? "stale" : "ok";
  }
  if (states.some((state) => state === "stale")) return "stale";
  return states[0] ?? "empty";
}

function hydrateAlert(alert: AlertsPayload["alerts"][number]): ServiceAlert {
  return {
    ...alert,
    activePeriodStart: alert.activePeriodStart
      ? new Date(alert.activePeriodStart)
      : null,
    activePeriodEnd: alert.activePeriodEnd
      ? new Date(alert.activePeriodEnd)
      : null,
  };
}

export function HomeDashboard() {
  const {
    position,
    error: locationError,
    isLoading: locationLoading,
    permissionState,
    requestLocation,
  } = useGeolocation({ autoRequest: true });
  const { favorites, isLoaded: favoritesLoaded } = useStationPreferences();
  const inFlightRequests = useRef(new Map<string, Promise<unknown>>());

  const [nearbyServices, setNearbyServices] = useState<NearbyService[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [savedStations, setSavedStations] = useState<SavedStationSnapshot[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [commute, setCommute] = useState<HomeCommuteSummary | null>(null);
  const [commuteLoading, setCommuteLoading] = useState(true);
  const [commuteError, setCommuteError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const requestData = useCallback(async <T,>(url: string): Promise<T> => {
    const existing = inFlightRequests.current.get(url) as Promise<T> | undefined;
    if (existing) return existing;

    const request = fetch(url)
      .then(async (response) => {
        const payload = await response.json() as ApiEnvelope<T>;
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? "Transit data is unavailable.");
        }
        return payload.data;
      })
      .finally(() => {
        inFlightRequests.current.delete(url);
      });
    inFlightRequests.current.set(url, request);
    return request;
  }, []);

  const loadStationRealtime = useCallback(async (
    station: StationApiRecord,
  ): Promise<{ departures: Departure[]; sourceState: RealtimeSourceState }> => {
    const sourceIds = station.sourceIds?.length
      ? station.sourceIds
      : station.allIds?.length
        ? station.allIds
        : [station.id];
    const payloads = await Promise.all(sourceIds.map((sourceId) =>
      requestData<TrainRealtimePayload>(
        `/api/trains/realtime?stationId=${encodeURIComponent(sourceId)}&limit=100`,
      )));
    return {
      departures: sortUniqueDepartures(payloads.flatMap((payload) =>
        payload.departures.map(hydrateDeparture))),
      sourceState: mergeSourceState(payloads.map((payload) => payload.sourceState)),
    };
  }, [requestData]);

  const loadNearby = useCallback(async () => {
    if (!position) {
      setNearbyLoading(false);
      setNearbyServices([]);
      setNearbyError(null);
      return;
    }

    setNearbyLoading(true);
    setNearbyError(null);
    const coordinates = `${position.latitude},${position.longitude}`;

    try {
      const [stationPayload, busStopPayload] = await Promise.all([
        requestData<{ stations: StationApiRecord[] }>(
          `/api/stations?near=${coordinates}&radius=1.5&limit=3`,
        ),
        requestData<{ groups: NearbyBusStopGroup[] }>(
          `/api/buses/stops?near=${coordinates}&radius=0.75&limit=4`,
        ),
      ]);
      const station = stationPayload.stations[0] ?? null;
      const busGroups = busStopPayload.groups;
      const stopIds = [...new Set(busGroups.flatMap((group) =>
        group.stops.map((stop) => stop.id)))].slice(0, MAX_NEARBY_BUS_STOP_IDS);

      const [subwayResult, busPayload] = await Promise.all([
        station
          ? loadStationRealtime(station)
          : Promise.resolve({ departures: [], sourceState: "empty" as const }),
        stopIds.length > 0
          ? requestData<BusRealtimePayload>(
              `/api/buses/nearby?${stopIds.map((stopId) =>
                `stopId=${encodeURIComponent(stopId)}`).join("&")}`,
            )
          : Promise.resolve({ results: [] }),
      ]);

      const busResults = busPayload.results.map((result) => ({
        ...result,
        departures: result.departures.map(hydrateDeparture),
        feedTimestamp: result.feedTimestamp ? new Date(result.feedTimestamp) : null,
      })) as NearbyBusRealtimeResult[];
      const services = buildNearbyServices({
        station: station ? toTransitStation(station) : null,
        subwayDepartures: subwayResult.departures,
        subwaySourceState: subwayResult.sourceState,
        busGroups,
        busResults,
      });
      setNearbyServices(services.slice(0, 6));
    } catch (cause) {
      setNearbyServices([]);
      setNearbyError(cause instanceof Error
        ? cause.message
        : "Nearby realtime is unavailable.");
    } finally {
      setNearbyLoading(false);
    }
  }, [loadStationRealtime, position, requestData]);

  const loadSavedStations = useCallback(async () => {
    if (!favoritesLoaded) return;
    const subwayFavorites = favorites
      .filter((favorite) => !/^(?:lirr|mnr)-/i.test(favorite.stationId))
      .slice(0, 2);
    if (subwayFavorites.length === 0) {
      setSavedStations([]);
      setSavedLoading(false);
      return;
    }

    setSavedLoading(true);
    const snapshots = await Promise.all(subwayFavorites.map(async (favorite) => {
      try {
        const payload = await requestData<{ stations: StationApiRecord[] }>(
          `/api/stations?id=${encodeURIComponent(favorite.stationId)}&limit=1`,
        );
        const station = payload.stations[0];
        if (!station) throw new Error("Saved station was not found.");
        const realtime = await loadStationRealtime(station);
        const transitStation = toTransitStation(station);
        const services = buildNearbyServices({
          station: transitStation,
          subwayDepartures: realtime.departures,
          subwaySourceState: realtime.sourceState,
          busGroups: [],
          busResults: [],
        });
        return {
          stationId: favorite.stationId,
          stationName: favorite.stationName,
          services: services.slice(0, 4),
          routeIds: transitStation.routeIds.length > 0
            ? transitStation.routeIds
            : [...new Set(realtime.departures.map((item) => item.routeId))],
          stopIds: transitStation.stops.map((stop) => stop.id),
          sourceState: realtime.sourceState,
          error: null,
        } satisfies SavedStationSnapshot;
      } catch (cause) {
        return {
          stationId: favorite.stationId,
          stationName: favorite.stationName,
          services: [],
          routeIds: [],
          stopIds: [],
          sourceState: "unavailable",
          error: cause instanceof Error ? cause.message : "Realtime unavailable.",
        } satisfies SavedStationSnapshot;
      }
    }));
    setSavedStations(snapshots);
    setSavedLoading(false);
  }, [favorites, favoritesLoaded, loadStationRealtime, requestData]);

  const loadContext = useCallback(async () => {
    const [alertsResult, commuteResult] = await Promise.allSettled([
      requestData<AlertsPayload>("/api/alerts?limit=25"),
      requestData<HomeCommuteSummary>("/api/commute/summary"),
    ]);

    if (alertsResult.status === "fulfilled") {
      setAlerts(alertsResult.value.alerts.map(hydrateAlert));
      setAlertsError(null);
    } else {
      setAlertsError("Service alerts are temporarily unavailable.");
    }
    setAlertsLoading(false);

    if (commuteResult.status === "fulfilled") {
      setCommute(commuteResult.value);
      setCommuteError(null);
    } else {
      setCommuteError("Commute information is temporarily unavailable.");
    }
    setCommuteLoading(false);
  }, [requestData]);

  useEffect(() => {
    void loadNearby();
  }, [loadNearby]);

  useEffect(() => {
    void loadSavedStations();
  }, [loadSavedStations]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useVisiblePolling(loadNearby, REALTIME_REFRESH_MS, Boolean(position));
  useVisiblePolling(loadSavedStations, REALTIME_REFRESH_MS, favoritesLoaded);
  useVisiblePolling(loadContext, CONTEXT_REFRESH_MS);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const relevantRouteIds = useMemo(() => [...new Set([
    ...nearbyServices.map((service) => service.departure.routeId),
    ...savedStations.flatMap((station) => station.routeIds),
    ...extractCommuteRouteIds(commute?.route ?? null),
  ])], [commute?.route, nearbyServices, savedStations]);
  const relevantStopIds = useMemo(() => new Set([
    ...nearbyServices.map((service) => service.departure.stopId),
    ...savedStations.flatMap((station) => station.stopIds),
  ]), [nearbyServices, savedStations]);
  const relevantAlerts = useMemo(() => prioritizeHomeAlerts({
    alerts,
    relevantRouteIds: new Set(relevantRouteIds),
    relevantStopIds,
    now,
    limit: 3,
  }), [alerts, now, relevantRouteIds, relevantStopIds]);
  const routeStatuses = useMemo(() => deriveRouteStatuses({
    routeIds: relevantRouteIds.slice(0, 6),
    alerts,
    now,
  }), [alerts, now, relevantRouteIds]);

  return (
    <HomeSections
      now={now}
      nearbyServices={nearbyServices}
      nearbyLoading={nearbyLoading || (
        permissionState === "granted" && !position && !locationError
      )}
      nearbyError={nearbyError}
      locationError={locationError?.message ?? null}
      locationPermission={permissionState}
      locationLoading={locationLoading}
      onRequestLocation={requestLocation}
      favoritesLoaded={favoritesLoaded && !savedLoading}
      savedStations={savedStations}
      commute={commute}
      commuteLoading={commuteLoading}
      commuteError={commuteError}
      alerts={relevantAlerts}
      alertsLoading={alertsLoading}
      alertsError={alertsError}
      routeStatuses={routeStatuses}
      planOrigin={position ? {
        name: "My location",
        latitude: position.latitude,
        longitude: position.longitude,
      } : null}
    />
  );
}
