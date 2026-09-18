"use client";

/**
 * RealtimeClient
 *
 * Orchestrates the Realtime page: fetching and polling live feeds, deriving
 * map geometry, and resolving the current URL selection into a contextual
 * detail surface.
 *
 * All selection state lives in the URL via `useRealtimeSelection`, so every
 * view — mode, route, station/stop, direction, trip, map-vs-diagram — is
 * deep-linkable and survives a reload.
 *
 * Layout is map-first: the map is the dominant element at every breakpoint,
 * with the detail surface as a contextual side panel on desktop and a bottom
 * sheet on mobile. The detail column is only mounted when something is
 * selected, so an empty state never costs the map width.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  BusList,
  LineDiagram,
  RailDiagram,
  RealtimeToolbar,
  TransitDetailPanel,
} from "@/components/realtime";
import { RealtimeMap } from "@/components/realtime/map";
import { Surface } from "@/components/ui";
import { useGeolocation, useRealtimeSelection } from "@/lib/hooks";
import {
  getLineColor,
  getLineName,
  getStationNameForDisplay,
  getLineStations,
  getLinesAtStation,
  getLineTerminals,
  type LineId,
} from "@/lib/gtfs/line-stations";
import {
  getRailBranchColor,
  getRailBranchStations,
  getRailStationName,
} from "@/lib/gtfs/rail-stations";
import { getBusRouteData, getBusStop } from "@/lib/gtfs/bus-stops";
import { getBusRouteColor } from "@/lib/gtfs/bus-routes";
import { getDirectionLabel } from "@/lib/transit/direction";
import type { BusArrival, RailArrival } from "@/types/mta";
import type { StationWithCoords } from "@/lib/utils/train-positioning";
import {
  arrivalState,
  buildBusVehicleDetail,
  buildMissingSelectionDetail,
  buildRailVehicleDetail,
  buildRouteDetail,
  buildStationDetail,
  buildSubwayTripDetail,
  type DetailArrival,
  type RouteBadgeDescriptor,
  type TransitDetailContent,
} from "@/components/realtime/detailContent";
import {
  getDeparturesForStop,
  getFollowingDepartures,
} from "@/lib/transit/departures";
import { parseSubwayRealtimePayload } from "@/lib/transit/realtime-client-payload";
import { getActiveSubwayTrips } from "@/lib/transit/trips";
import type {
  Departure,
  RealtimeSourceState,
  SubwayTrip,
} from "@/types/transit";

const REFRESH_INTERVAL_SECONDS = 30;

/**
 * How old the last successful refresh may be before the UI stops presenting it
 * as live. Two missed polls, so a single slow response does not flap the state.
 */
const STALE_AFTER_MS = REFRESH_INTERVAL_SECONDS * 2 * 1000 + 5_000;

interface TrainData {
  trips: SubwayTrip[];
  departures: Departure[];
  sourceState: RealtimeSourceState;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

interface BusData {
  arrivals: BusArrival[];
  availableRoutes: string[];
  lastUpdated: Date | null;
  isLoading: boolean;
  isRoutesLoading: boolean;
  error: string | null;
}

interface RailBranch {
  id: string;
  name: string;
}

interface RailData {
  arrivals: RailArrival[];
  availableBranches: RailBranch[];
  lastUpdated: Date | null;
  isLoading: boolean;
  isBranchesLoading: boolean;
  error: string | null;
}

const BUS_LINE_FALLBACK_COLOR = "#0039A6";

export function RealtimeClient() {
  const {
    selection,
    setMode,
    setRoute,
    setStation,
    setStop,
    setTrip,
    setView,
    setDirection,
    clearDetail,
  } = useRealtimeSelection();

  const mode = selection.mode;
  const routeId = selection.routeId ?? null;
  const view = selection.view ?? "map";

  const [trainData, setTrainData] = useState<TrainData>({
    trips: [],
    departures: [],
    sourceState: "empty",
    lastUpdated: null,
    isLoading: false,
    error: null,
  });

  const [busData, setBusData] = useState<BusData>({
    arrivals: [],
    availableRoutes: [],
    lastUpdated: null,
    isLoading: false,
    isRoutesLoading: false,
    error: null,
  });

  const [railData, setRailData] = useState<RailData>({
    arrivals: [],
    availableBranches: [],
    lastUpdated: null,
    isLoading: false,
    isBranchesLoading: false,
    error: null,
  });

  /** Geolocation is opt-in: nothing is requested until the user presses. */
  const {
    position: userLocation,
    isLoading: isLocating,
    permissionState: locationPermission,
    requestLocation,
  } = useGeolocation();

  // -------------------------------------------------------------------------
  // Fetching
  // -------------------------------------------------------------------------

  const fetchTrains = useCallback(async () => {
    if (!routeId) {
      setTrainData((prev) => ({
        ...prev,
        trips: [],
        departures: [],
        sourceState: "empty",
        error: null,
      }));
      return;
    }

    setTrainData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/trains/realtime?routeId=${encodeURIComponent(routeId)}&limit=500`,
      );
      const data = await response.json();

      if (data.success && data.data) {
        const payload = parseSubwayRealtimePayload(data.data);

        setTrainData({
          trips: payload.trips,
          departures: payload.departures,
          sourceState: payload.sourceState,
          lastUpdated: payload.lastUpdated,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(data.error || "Failed to fetch train data");
      }
    } catch (error) {
      console.error("Failed to fetch trains:", error);
      setTrainData((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch train data",
      }));
    }
  }, [routeId]);

  const fetchBusRoutes = useCallback(async () => {
    setBusData((prev) => ({ ...prev, isRoutesLoading: true }));

    try {
      const response = await fetch("/api/buses/routes");
      const data = await response.json();

      if (data.success) {
        setBusData((prev) => ({
          ...prev,
          availableRoutes: data.data.routes,
          isRoutesLoading: false,
        }));
        return;
      }
      throw new Error("Bus route list unavailable");
    } catch {
      const { getAllKnownRoutes } = await import("@/lib/gtfs/bus-routes");
      setBusData((prev) => ({
        ...prev,
        availableRoutes: getAllKnownRoutes(),
        isRoutesLoading: false,
      }));
    }
  }, []);

  const fetchBuses = useCallback(async () => {
    if (!routeId) {
      setBusData((prev) => ({ ...prev, arrivals: [], error: null }));
      return;
    }

    setBusData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Encoded because SBS route ids contain `+`.
      const response = await fetch(
        `/api/buses/realtime?routeId=${encodeURIComponent(routeId)}&limit=50`,
      );
      const data = await response.json();

      if (data.success && data.data?.arrivals) {
        const arrivals: BusArrival[] = data.data.arrivals.map(
          (arrival: BusArrival) => ({
            ...arrival,
            arrivalTime: arrival.arrivalTime ? new Date(arrival.arrivalTime) : null,
          }),
        );

        setBusData((prev) => ({
          ...prev,
          arrivals,
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        }));
      } else {
        throw new Error(data.error || "Failed to fetch bus data");
      }
    } catch (error) {
      console.error("Failed to fetch buses:", error);
      setBusData((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch bus data",
      }));
    }
  }, [routeId]);

  const fetchRailBranches = useCallback(
    async (railMode: "lirr" | "metro-north") => {
      setRailData((prev) => ({ ...prev, isBranchesLoading: true }));

      const endpoint =
        railMode === "lirr" ? "/api/lirr/realtime" : "/api/metro-north/realtime";

      try {
        const response = await fetch(`${endpoint}?limit=1`);
        const data = await response.json();

        if (data.success && data.data?.branches) {
          setRailData((prev) => ({
            ...prev,
            availableBranches: data.data.branches,
            isBranchesLoading: false,
          }));
          return;
        }
        throw new Error("Branch list unavailable");
      } catch {
        const { getAllLirrBranches, getAllMnrLines } = await import(
          "@/lib/gtfs/rail-stations"
        );
        const branches =
          railMode === "lirr"
            ? getAllLirrBranches().map((b) => ({ id: b.id, name: b.name }))
            : getAllMnrLines().map((l) => ({ id: l.id, name: l.name }));
        setRailData((prev) => ({
          ...prev,
          availableBranches: branches,
          isBranchesLoading: false,
        }));
      }
    },
    [],
  );

  const fetchRailArrivals = useCallback(async () => {
    if (!routeId || (mode !== "lirr" && mode !== "metro-north")) {
      setRailData((prev) => ({ ...prev, arrivals: [], error: null }));
      return;
    }

    setRailData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const endpoint =
        mode === "lirr" ? "/api/lirr/realtime" : "/api/metro-north/realtime";
      const response = await fetch(
        `${endpoint}?routeId=${encodeURIComponent(routeId)}&limit=100`,
      );
      const data = await response.json();

      if (data.success && data.data?.arrivals) {
        const arrivals: RailArrival[] = data.data.arrivals.map(
          (arrival: RailArrival) => ({
            ...arrival,
            arrivalTime: new Date(arrival.arrivalTime),
            departureTime: arrival.departureTime
              ? new Date(arrival.departureTime)
              : null,
          }),
        );

        setRailData((prev) => ({
          ...prev,
          arrivals,
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        }));
      } else {
        throw new Error(data.error || "Failed to fetch rail data");
      }
    } catch (error) {
      console.error("Failed to fetch rail arrivals:", error);
      setRailData((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch rail data",
      }));
    }
  }, [routeId, mode]);

  useEffect(() => {
    fetchBusRoutes();
  }, [fetchBusRoutes]);

  useEffect(() => {
    if (mode === "lirr" || mode === "metro-north") {
      fetchRailBranches(mode);
    }
  }, [mode, fetchRailBranches]);

  useEffect(() => {
    if (mode === "subway") fetchTrains();
  }, [mode, fetchTrains]);

  useEffect(() => {
    if (mode === "bus") fetchBuses();
  }, [mode, fetchBuses]);

  useEffect(() => {
    if (mode === "lirr" || mode === "metro-north") fetchRailArrivals();
  }, [mode, fetchRailArrivals]);

  const refresh = useCallback(() => {
    if (mode === "subway") fetchTrains();
    else if (mode === "bus") fetchBuses();
    else fetchRailArrivals();
  }, [mode, fetchTrains, fetchBuses, fetchRailArrivals]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!routeId) return;
    const interval = setInterval(
      () => refreshRef.current(),
      REFRESH_INTERVAL_SECONDS * 1000,
    );
    return () => clearInterval(interval);
  }, [routeId, mode]);

  // -------------------------------------------------------------------------
  // Derived route context
  // -------------------------------------------------------------------------

  const isRailMode = mode === "lirr" || mode === "metro-north";

  const lastUpdated =
    mode === "subway"
      ? trainData.lastUpdated
      : mode === "bus"
        ? busData.lastUpdated
        : railData.lastUpdated;

  const isLoading =
    mode === "subway"
      ? trainData.isLoading
      : mode === "bus"
        ? busData.isLoading
        : railData.isLoading;

  const error =
    mode === "subway"
      ? trainData.error
      : mode === "bus"
        ? busData.error
        : railData.error;

  /**
   * Staleness is re-evaluated on a ticker rather than only on fetch, so a page
   * left open on a dead feed starts telling the truth without a refresh.
   */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const isStale =
    (mode === "subway" && trainData.sourceState === "stale") ||
    (lastUpdated !== null && now - lastUpdated.getTime() > STALE_AFTER_MS);

  const mapStations = useMemo<StationWithCoords[]>(() => {
    if (!routeId) return [];

    if (mode === "subway") {
      return getLineStations(routeId as LineId)
        .filter((s) => s.lat && s.lon)
        .map((s) => ({
          id: s.id,
          name: s.name,
          lat: s.lat as number,
          lon: s.lon as number,
          type: s.type,
        }));
    }

    if (isRailMode) {
      return getRailBranchStations(routeId, mode)
        .filter((s) => s.lat && s.lon)
        .map((s) => ({
          id: s.id,
          name: s.name,
          lat: s.lat as number,
          lon: s.lon as number,
          type: s.type,
        }));
    }

    return getBusRouteData(routeId).stops.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
    }));
  }, [mode, routeId, isRailMode]);

  const busRouteShape = useMemo(
    () => (mode === "bus" && routeId ? getBusRouteData(routeId).shape : []),
    [mode, routeId],
  );

  const routeColor = useMemo(() => {
    if (!routeId) return BUS_LINE_FALLBACK_COLOR;
    if (mode === "subway") return getLineColor(routeId as LineId);
    if (isRailMode) return getRailBranchColor(routeId, mode);
    return getBusRouteColor(routeId);
  }, [mode, routeId, isRailMode]);

  const routeLabel = useMemo(() => {
    if (!routeId) return "this route";
    if (mode === "subway") return `${routeId} train`;
    if (mode === "bus") return `${routeId} bus`;
    return (
      railData.availableBranches.find((b) => b.id === routeId)?.name ?? routeId
    );
  }, [mode, routeId, railData.availableBranches]);

  const routeBadge = useMemo<RouteBadgeDescriptor | undefined>(() => {
    if (!routeId) return undefined;
    if (mode === "subway") return { kind: "subway", line: routeId };
    if (mode === "bus") return { kind: "bus", route: routeId };
    return {
      kind: "rail",
      branchId: routeId,
      branchName: routeLabel,
      mode,
    };
  }, [mode, routeId, routeLabel]);

  /** Direction filter from URL state, projected onto each feed's vocabulary. */
  const directionLabel = selection.direction
    ? getDirectionLabel(selection.direction)
    : undefined;

  const visibleSubwayTrips = useMemo(() => {
    if (mode !== "subway") return [];
    return getActiveSubwayTrips(
      { trips: trainData.trips },
      {
        routeId: routeId ?? undefined,
        direction: selection.direction,
      },
    );
  }, [mode, trainData.trips, routeId, selection.direction]);

  const visibleRailTrains = useMemo(() => {
    if (!isRailMode) return [];
    if (selection.direction === "inbound" || selection.direction === "outbound") {
      return railData.arrivals.filter((t) => t.direction === selection.direction);
    }
    return railData.arrivals;
  }, [isRailMode, railData.arrivals, selection.direction]);

  const visibleBuses = mode === "bus" ? busData.arrivals : [];

  const vehicleCount =
    mode === "subway"
      ? visibleSubwayTrips.length
      : mode === "bus"
        ? visibleBuses.filter((b) => b.latitude && b.longitude).length
        : visibleRailTrains.filter((t) => t.routeId === routeId).length;

  // -------------------------------------------------------------------------
  // Detail surface
  // -------------------------------------------------------------------------

  const selectedVehicleId = selection.tripId;
  const selectedStationId = selection.stationId ?? selection.stopId;

  /**
   * Whether the active feed has returned at least once. Until it has, a
   * deep-linked vehicle simply has not arrived yet, so reporting it as "no
   * longer reporting" would be a lie told on every shared link.
   */
  const hasLoadedOnce = lastUpdated !== null;

  const detailContent = useMemo<TransitDetailContent | null>(() => {
    if (!routeId || !routeBadge) return null;
    if (!hasLoadedOnce && (selectedVehicleId || selectedStationId)) return null;

    // 1. A specific vehicle wins over a station: it is the narrower selection.
    if (selectedVehicleId) {
      if (mode === "subway") {
        const trip = trainData.trips.find((item) => item.id === selectedVehicleId);
        if (!trip) {
          const currentDepartures = getDeparturesForStop(
            trainData.departures,
            selectedStationId ?? "",
          )
            .filter(
              (departure) =>
                departure.routeId === routeId &&
                (!selection.direction || departure.direction === selection.direction),
            )
            .slice(0, 5)
            .map((departure) => ({
              id: departure.tripId,
              badge: { kind: "subway" as const, line: departure.routeId },
              primary: departure.destination ?? `${departure.routeId} train`,
              secondary: getDirectionLabel(departure.direction),
              minutesAway: departure.minutesAway,
              state: arrivalState({
                minutesAway: departure.minutesAway,
                delaySeconds: departure.delaySeconds,
                isStale,
              }),
            }));
          return buildMissingSelectionDetail({
            kind: "vehicle",
            label: "Train no longer reporting",
            badge: routeBadge,
            arrivals: currentDepartures,
          });
        }

        const selectedDeparture =
          trainData.departures.find(
            (departure) => departure.tripId === selectedVehicleId,
          ) ?? null;
        const followingDepartures = selectedDeparture
          ? getFollowingDepartures(trainData.departures, {
              selectedTripId: selectedVehicleId,
              stopId: selectedDeparture.stopId,
              limit: 4,
            })
          : [];
        const platformDepartures = selectedDeparture
          ? trainData.departures
              .filter(
                (departure) =>
                  departure.tripId !== selectedVehicleId &&
                  departure.routeId !== selectedDeparture.routeId &&
                  departure.direction === selectedDeparture.direction &&
                  departure.stopId === selectedDeparture.stopId,
              )
              .slice(0, 3)
          : [];

        return buildSubwayTripDetail({
          trip,
          selectedDeparture,
          followingDepartures,
          platformDepartures,
          boardingStopId: selectedStationId,
          stationName: (stopId) =>
            getStationNameForDisplay(stopId, mapStations),
          isStale,
        });
      }

      if (mode === "bus") {
        const bus = busData.arrivals.find(
          (b) => b.vehicleId === selectedVehicleId,
        );
        if (!bus) {
          return buildMissingSelectionDetail({
            kind: "vehicle",
            label: "Bus no longer reporting",
          });
        }
        return buildBusVehicleDetail({ bus, isStale });
      }

      const train = railData.arrivals.find((t) => t.tripId === selectedVehicleId);
      if (!train) {
        return buildMissingSelectionDetail({
          kind: "vehicle",
          label: "Train no longer reporting",
        });
      }
      return buildRailVehicleDetail({
        train,
        mode: mode as "lirr" | "metro-north",
        nextStopName: getRailStationName(train.stopId, mode),
        isStale,
      });
    }

    // 2. A station or stop.
    if (selectedStationId) {
      const station = mapStations.find((s) => s.id === selectedStationId);

      if (mode === "bus") {
        const stop = station ?? getBusStop(selectedStationId);
        if (!stop) {
          return buildMissingSelectionDetail({
            kind: "station",
            label: "Stop not on this route",
          });
        }
        const arrivals: DetailArrival[] = busData.arrivals
          .filter((b) => b.nextStopId === selectedStationId)
          .slice(0, 8)
          .map((b) => ({
            id: b.vehicleId,
            badge: { kind: "bus", route: b.routeId },
            primary: b.headsign ?? `${b.routeId} bus`,
            secondary: `Vehicle ${b.vehicleId}`,
            minutesAway: b.minutesAway,
            state: arrivalState({ minutesAway: b.minutesAway, isStale }),
          }));

        return buildStationDetail({
          mode,
          stationName: stop.name,
          serves: [{ kind: "bus", route: routeId }],
          directionLabel,
          arrivals,
          isStale,
        });
      }

      if (!station) {
        return buildMissingSelectionDetail({
          kind: "station",
          label: "Station not on this route",
        });
      }

      if (mode === "subway") {
        const arrivals: DetailArrival[] = getDeparturesForStop(
          trainData.departures,
          station.id,
        )
          .filter(
            (departure) =>
              !selection.direction ||
              selection.direction === "unknown" ||
              departure.direction === selection.direction,
          )
          .slice(0, 8)
          .map((departure) => ({
            id: departure.tripId,
            badge: { kind: "subway", line: departure.routeId },
            primary: departure.destination ?? `${departure.routeId} train`,
            secondary: getDirectionLabel(departure.direction),
            minutesAway: departure.minutesAway,
            state: arrivalState({
              minutesAway: departure.minutesAway,
              delaySeconds: departure.delaySeconds,
              isStale,
            }),
          }));

        return buildStationDetail({
          mode,
          stationName: station.name,
          stationType: station.type,
          serves: getLinesAtStation(station.id).map((line) => ({
            kind: "subway" as const,
            line,
          })),
          directionLabel,
          arrivals,
          isStale,
        });
      }

      const arrivals: DetailArrival[] = railData.arrivals
        .filter((t) => t.stopId === station.id)
        .slice(0, 8)
        .map((t) => ({
          id: t.tripId,
          primary: t.trainId ? `Train ${t.trainId}` : t.branchName,
          secondary: t.direction === "inbound" ? "Inbound" : "Outbound",
          minutesAway: t.minutesAway,
          state: arrivalState({
            minutesAway: t.minutesAway,
            delaySeconds: t.delay,
            isStale,
          }),
        }));

      return buildStationDetail({
        mode,
        stationName: station.name,
        stationType: station.type,
        serves: [routeBadge],
        directionLabel,
        arrivals,
        isStale,
      });
    }

    // 3. Otherwise summarize the route itself.
    const terminals =
      mode === "subway"
        ? Object.values(getLineTerminals(routeId as LineId))
            .filter((t): t is NonNullable<typeof t> => t !== null)
            .map((t) => t.name)
        : mapStations.length > 1
          ? [mapStations[0].name, mapStations[mapStations.length - 1].name]
          : [];

    return buildRouteDetail({
      mode,
      routeId,
      routeName:
        mode === "subway" ? getLineName(routeId as LineId) : routeLabel,
      badge: routeBadge,
      terminals,
      stationCount: mapStations.length,
      vehicleCount,
      directionLabel,
      isStale,
      lastUpdated,
    });
  }, [
    routeId,
    routeBadge,
    routeLabel,
    mode,
    mapStations,
    selectedVehicleId,
    selectedStationId,
    trainData.trips,
    trainData.departures,
    busData.arrivals,
    railData.arrivals,
    directionLabel,
    selection.direction,
    vehicleCount,
    isStale,
    lastUpdated,
    hasLoadedOnce,
  ]);

  /**
   * A route-only selection renders in the desktop panel but does not raise the
   * mobile sheet, which would otherwise cover the map on every route change.
   */
  const hasExplicitSelection = Boolean(selectedVehicleId || selectedStationId);

  const handleSelectStation = useCallback(
    (stationId: string | null) => {
      if (mode === "bus") setStop(stationId);
      else setStation(stationId);
    },
    [mode, setStop, setStation],
  );

  const handleSelectVehicle = useCallback(
    (vehicleId: string | null) => {
      if (mode === "subway" && vehicleId) {
        const trip = trainData.trips.find((item) => item.id === vehicleId);
        setTrip(
          vehicleId,
          trip
            ? { routeId: trip.route.id, direction: trip.direction }
            : undefined,
        );
        return;
      }
      setTrip(vehicleId);
    },
    [mode, setTrip, trainData.trips],
  );

  const handleViewFullRoute = useCallback(() => {
    setTrip(null);
    setStation(null);
  }, [setStation, setTrip]);

  const updatedLabel = lastUpdated
    ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}`
    : null;

  return (
    // `min-h-0` lets the map region shrink inside the flex column instead of
    // forcing the page to scroll.
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <RealtimeToolbar
        mode={mode}
        onModeChange={setMode}
        view={view}
        onViewChange={setView}
        routeId={routeId}
        onRouteChange={setRoute}
        direction={selection.direction}
        onDirectionChange={setDirection}
        busRoutes={busData.availableRoutes}
        isBusRoutesLoading={busData.isRoutesLoading}
        railBranches={railData.availableBranches}
        isRailBranchesLoading={railData.isBranchesLoading}
        isRefreshing={isLoading}
        onRefresh={refresh}
        updatedLabel={updatedLabel}
      />

      {/*
        The visualization takes every pixel the chrome above it leaves, so the
        map stays dominant however the toolbar wraps. The floor keeps it usable
        on short landscape phones, at the cost of scrolling there.
      */}
      <div className="min-h-[22rem] flex-1">
        {view === "map" ? (
          <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Surface
              elevation="panel"
              className="relative min-h-0 overflow-hidden lg:col-start-1"
            >
              <RealtimeMap
                mode={mode}
                routeId={routeId}
                routeColor={routeColor}
                routeLabel={routeLabel}
                stations={mapStations}
                subwayTrips={visibleSubwayTrips}
                subwayDepartures={trainData.departures}
                railTrains={visibleRailTrains}
                buses={visibleBuses}
                busRouteShape={busRouteShape}
                isLoading={isLoading}
                error={error}
                isStale={isStale}
                vehicleCount={vehicleCount}
                selectedStationId={selectedStationId}
                selectedVehicleId={selectedVehicleId}
                focusSelectedTrip={mode === "subway" && Boolean(selectedVehicleId && selectedStationId)}
                onSelectStation={handleSelectStation}
                onSelectVehicle={handleSelectVehicle}
                onRetry={refresh}
                userLocation={userLocation}
                locationPermission={locationPermission}
                isLocating={isLocating}
                onRequestLocation={requestLocation}
              />

              {/* Mobile detail overlays the map instead of sitting below it in
                  the page flow. HeroUI's bottom Drawer is `position: absolute`
                  and was expanding under the map rather than covering it. */}
              {hasExplicitSelection && detailContent && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={detailContent.title}
                  className="absolute inset-x-0 bottom-0 z-[800] flex max-h-[min(22rem,60%)] min-h-0 flex-col overflow-hidden rounded-t-lg border border-border-strong bg-surface-floating lg:hidden"
                  style={{ boxShadow: "var(--shadow-lg)" }}
                >
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <TransitDetailPanel
                      content={detailContent}
                      onClose={clearDetail}
                      onViewFullRoute={mode === "subway" && Boolean(selectedVehicleId) ? handleViewFullRoute : undefined}
                      onSelectArrival={
                        detailContent.arrivals?.length
                          ? handleSelectVehicle
                          : undefined
                      }
                      selectedArrivalId={selectedVehicleId}
                    />
                  </div>
                </div>
              )}
            </Surface>

            {/* Desktop contextual panel. Absent — not empty — when there is
                no route selected, so the map keeps the full width. */}
            {detailContent && (
              // The landmark wraps `Surface` rather than using its `as` prop,
              // because `Surface` does not forward arbitrary attributes and
              // the region needs an accessible name.
              <aside
                aria-label="Selection details"
                className="hidden min-h-0 lg:block"
              >
                <Surface
                  elevation="elevated"
                  className="h-full overflow-hidden"
                >
                  <TransitDetailPanel
                    content={detailContent}
                    // Only an explicit pick is dismissable; the route summary
                    // is the panel's resting state.
                    onClose={hasExplicitSelection ? clearDetail : undefined}
                    onViewFullRoute={mode === "subway" && Boolean(selectedVehicleId) ? handleViewFullRoute : undefined}
                    onSelectArrival={
                      detailContent.arrivals?.length
                        ? handleSelectVehicle
                        : undefined
                    }
                    selectedArrivalId={selectedVehicleId}
                  />
                </Surface>
              </aside>
            )}
          </div>
        ) : (
          <div className="h-full min-h-0">
            {mode === "subway" && (
              <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="relative min-h-0 overflow-hidden">
                  <LineDiagram
                    selectedLine={routeId as LineId | null}
                    trips={visibleSubwayTrips}
                    departures={trainData.departures}
                    selectedTripId={selectedVehicleId}
                    onSelectTrip={handleSelectVehicle}
                    isLoading={trainData.isLoading}
                    error={trainData.error}
                  />

                  {hasExplicitSelection && detailContent && (
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-label={detailContent.title}
                      className="absolute inset-x-0 bottom-0 z-40 flex max-h-[min(22rem,60%)] min-h-0 flex-col overflow-hidden rounded-t-lg border border-border-strong bg-surface-floating lg:hidden"
                      style={{ boxShadow: "var(--shadow-lg)" }}
                    >
                      <TransitDetailPanel
                        content={detailContent}
                        onClose={clearDetail}
                        onViewFullRoute={mode === "subway" && Boolean(selectedVehicleId) ? handleViewFullRoute : undefined}
                        onSelectArrival={
                          detailContent.arrivals?.length
                            ? handleSelectVehicle
                            : undefined
                        }
                        selectedArrivalId={selectedVehicleId}
                      />
                    </div>
                  )}
                </div>

                {detailContent && (
                  <aside aria-label="Selection details" className="hidden min-h-0 lg:block">
                    <Surface elevation="elevated" className="h-full overflow-hidden">
                      <TransitDetailPanel
                        content={detailContent}
                        onClose={hasExplicitSelection ? clearDetail : undefined}
                        onViewFullRoute={mode === "subway" && Boolean(selectedVehicleId) ? handleViewFullRoute : undefined}
                        onSelectArrival={
                          detailContent.arrivals?.length
                            ? handleSelectVehicle
                            : undefined
                        }
                        selectedArrivalId={selectedVehicleId}
                      />
                    </Surface>
                  </aside>
                )}
              </div>
            )}
            {mode === "bus" && (
              <BusList
                selectedRoute={routeId}
                buses={busData.arrivals}
                isLoading={busData.isLoading}
                error={busData.error}
                lastUpdated={busData.lastUpdated}
              />
            )}
            {isRailMode && (
              <RailDiagram
                mode={mode}
                selectedBranch={routeId}
                selectedBranchName={routeLabel}
                trains={visibleRailTrains}
                isLoading={railData.isLoading}
                error={railData.error}
                lastUpdated={railData.lastUpdated}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
