"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Clock, RefreshCw, Star, Train } from "lucide-react";
import Link from "next/link";

import { ArrivalsList } from "./ArrivalsList";
import { StationSearch, type StationSearchResult } from "./StationSearch";
import { StationAccessibilityStatus } from "@/components/accessibility/StationAccessibilityStatus";
import { EmptyState, ErrorState, SubwayBullet, Surface } from "@/components/ui";
import { useStationPreferences } from "@/lib/hooks/useStationPreferences";
import type { TrainArrival } from "@/types/mta";
import { buildPlanQueryString } from "@/lib/transit/rider-query-state";

interface StationBoardProps {
  initialStationId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface ArrivalsState {
  northbound: TrainArrival[];
  southbound: TrainArrival[];
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_ARRIVALS: ArrivalsState = {
  northbound: [],
  southbound: [],
  lastUpdated: null,
  isLoading: false,
  error: null,
};

export function StationBoard({
  initialStationId,
  autoRefresh = true,
  refreshInterval = 30,
}: StationBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { primaryStation, addFavorite, removeFavorite, isFavorite, favorites } = useStationPreferences();
  const queryStationId = searchParams.get("station")?.trim() || null;
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    initialStationId ?? queryStationId,
  );
  const [selectedStationName, setSelectedStationName] = useState("");
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [stationLocation, setStationLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [arrivals, setArrivals] = useState<ArrivalsState>(EMPTY_ARRIVALS);

  const writeStationUrl = useCallback((stationId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("station", stationId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (queryStationId && queryStationId !== selectedStationId) {
      setSelectedStationId(queryStationId);
      setSelectedStationName("");
      setRouteIds([]);
    }
  }, [queryStationId, selectedStationId]);

  useEffect(() => {
    if (!selectedStationId && primaryStation) {
      setSelectedStationId(primaryStation.stationId);
      setSelectedStationName(primaryStation.stationName);
      writeStationUrl(primaryStation.stationId);
    }
  }, [primaryStation, selectedStationId, writeStationUrl]);

  const fetchArrivals = useCallback(async () => {
    if (!selectedStationId) return;
    setArrivals((previous) => ({ ...previous, isLoading: true, error: null }));

    try {
      const stationResponse = await fetch(`/api/stations?id=${encodeURIComponent(selectedStationId)}`);
      const stationPayload = await stationResponse.json() as {
        success: boolean;
        data?: { stations: StationSearchResult[] };
      };
      const station = stationPayload.data?.stations[0];
      if (!stationResponse.ok || !stationPayload.success || !station) {
        throw new Error("Station not found. Search for another station.");
      }

      setSelectedStationName(station.name);
      setRouteIds(station.routeIds ?? []);
      setStationLocation({ latitude: station.latitude, longitude: station.longitude });
      const northPlatforms = station.allPlatforms?.north?.length
        ? station.allPlatforms.north
        : [`${selectedStationId}N`];
      const southPlatforms = station.allPlatforms?.south?.length
        ? station.allPlatforms.south
        : [`${selectedStationId}S`];

      const requestPlatforms = (platforms: string[]) => Promise.all(platforms.map(async (platformId) => {
        const response = await fetch(`/api/trains/realtime?stationId=${encodeURIComponent(platformId)}&limit=10`);
        const payload = await response.json() as {
          success: boolean;
          data?: { arrivals?: TrainArrival[] };
        };
        return payload.success ? payload.data?.arrivals ?? [] : [];
      }));

      const [northResults, southResults] = await Promise.all([
        requestPlatforms(northPlatforms),
        requestPlatforms(southPlatforms),
      ]);
      const seenTrips = new Set<string>();
      const normalize = (groups: TrainArrival[][]) => groups.flatMap((group) => group).flatMap((arrival) => {
        if (seenTrips.has(arrival.tripId)) return [];
        seenTrips.add(arrival.tripId);
        return [{
          ...arrival,
          arrivalTime: new Date(arrival.arrivalTime),
          departureTime: arrival.departureTime ? new Date(arrival.departureTime) : null,
        }];
      }).sort((left, right) => left.arrivalTime.getTime() - right.arrivalTime.getTime());

      const northbound = normalize(northResults);
      const southbound = normalize(southResults);
      setRouteIds([...new Set([
        ...(station.routeIds ?? []),
        ...northbound.map((arrival) => arrival.routeId),
        ...southbound.map((arrival) => arrival.routeId),
      ])]);
      setArrivals({
        northbound: northbound.slice(0, 10),
        southbound: southbound.slice(0, 10),
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setArrivals((previous) => ({
        ...previous,
        isLoading: false,
        error: error instanceof Error ? error.message : "Departures are temporarily unavailable.",
      }));
    }
  }, [selectedStationId]);

  useEffect(() => {
    if (selectedStationId) void fetchArrivals();
  }, [fetchArrivals, selectedStationId]);

  useEffect(() => {
    if (!autoRefresh || !selectedStationId) return;
    const interval = window.setInterval(fetchArrivals, refreshInterval * 1000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, fetchArrivals, refreshInterval, selectedStationId]);

  const handleStationSelect = (
    stationId: string,
    stationName: string,
    _allPlatforms?: { north: string[]; south: string[] },
    location?: { latitude: number; longitude: number },
  ) => {
    setSelectedStationId(stationId);
    setSelectedStationName(stationName);
    setRouteIds([]);
    setStationLocation(location ?? null);
    setArrivals(EMPTY_ARRIVALS);
    writeStationUrl(stationId);
  };

  const isSaved = selectedStationId ? isFavorite(selectedStationId) : false;
  const toggleSaved = () => {
    if (!selectedStationId || !selectedStationName) return;
    if (isSaved) removeFavorite(selectedStationId);
    else addFavorite(selectedStationId, selectedStationName);
  };

  return (
    <div className="space-y-5">
      <StationSearch
        onSelect={handleStationSelect}
        selectedId={selectedStationId}
        favoriteIds={favorites.map((favorite) => favorite.stationId)}
        savedStations={favorites.map((favorite) => ({ id: favorite.stationId, name: favorite.stationName }))}
      />

      {!selectedStationId ? (
        <EmptyState
          icon={<Train className="h-6 w-6" aria-hidden="true" />}
          title="Choose a station"
          description="Search by station name or pick one of your saved stations."
          headingLevel="h2"
        />
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">
                {selectedStationName || "Loading station…"}
              </h2>
              {routeIds.length > 0 && (
                <div aria-label="Routes served" className="mt-2 flex flex-wrap gap-1.5">
                  {routeIds.map((routeId) => <SubwayBullet key={routeId} line={routeId} size="sm" />)}
                </div>
              )}
              {arrivals.lastUpdated && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground/60">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Updated {formatDistanceToNow(arrivals.lastUpdated, { addSuffix: true })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {stationLocation && (
                <Link
                  href={`/routes?${buildPlanQueryString({
                    from: {
                      name: selectedStationName,
                      stationId: selectedStationId,
                      ...stationLocation,
                    },
                    to: null,
                    accessible: false,
                  })}`}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:bg-surface-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  Plan from here
                </Link>
              )}
              <button
                type="button"
                aria-label={isSaved ? "Remove saved station" : "Save station"}
                aria-pressed={isSaved}
                onClick={toggleSaved}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-foreground/65 hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Star className={`h-5 w-5 ${isSaved ? "fill-current text-state-advisory" : ""}`} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Refresh departures"
                onClick={() => void fetchArrivals()}
                disabled={arrivals.isLoading}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-foreground/65 hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${arrivals.isLoading ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
              </button>
            </div>
          </header>

          {selectedStationName && (
            <StationAccessibilityStatus stationName={selectedStationName} />
          )}

          {arrivals.error ? (
            <ErrorState
              title="Departures unavailable"
              description={arrivals.error}
              onRetry={() => void fetchArrivals()}
            />
          ) : (
            <Surface as="section" className="overflow-hidden">
              <div className="grid divide-y divide-border-subtle md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="p-4 sm:p-5">
                  <ArrivalsList
                    arrivals={arrivals.northbound}
                    isLoading={arrivals.isLoading && arrivals.northbound.length === 0}
                    directionLabel="Uptown / Bronx"
                    maxArrivals={5}
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <ArrivalsList
                    arrivals={arrivals.southbound}
                    isLoading={arrivals.isLoading && arrivals.southbound.length === 0}
                    directionLabel="Downtown / Brooklyn"
                    maxArrivals={5}
                  />
                </div>
              </div>
            </Surface>
          )}
        </>
      )}
    </div>
  );
}
