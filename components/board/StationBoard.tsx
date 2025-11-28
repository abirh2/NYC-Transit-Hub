"use client";

/**
 * StationBoard Component
 * 
 * Main component for displaying train arrivals at a selected station.
 * Includes station search, arrivals by direction, and refresh functionality.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader, Button, Divider } from "@heroui/react";
import { RefreshCw, Star, Train, Clock } from "lucide-react";
import { StationSearch } from "./StationSearch";
import { ArrivalsList } from "./ArrivalsList";
import { useStationPreferences } from "@/lib/hooks/useStationPreferences";
import type { TrainArrival } from "@/types/mta";
import { formatDistanceToNow } from "date-fns";

interface StationBoardProps {
  /** Initially selected station ID (overrides preferences) */
  initialStationId?: string;
  /** Whether to auto-refresh arrivals */
  autoRefresh?: boolean;
  /** Refresh interval in seconds */
  refreshInterval?: number;
}

interface ArrivalsState {
  northbound: TrainArrival[];
  southbound: TrainArrival[];
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

export function StationBoard({
  initialStationId,
  autoRefresh = true,
  refreshInterval = 30,
}: StationBoardProps) {
  const { primaryStation, addFavorite, removeFavorite, isFavorite, favorites } =
    useStationPreferences();

  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    initialStationId ?? null
  );
  const [selectedStationName, setSelectedStationName] = useState<string>("");
  // Store all platform IDs for stations with multiple complexes (e.g., Times Sq)
  const [arrivals, setArrivals] = useState<ArrivalsState>({
    northbound: [],
    southbound: [],
    lastUpdated: null,
    isLoading: false,
    error: null,
  });

  // Use primary station from preferences if no station selected
  useEffect(() => {
    if (!selectedStationId && primaryStation) {
      setSelectedStationId(primaryStation.stationId);
      setSelectedStationName(primaryStation.stationName);
      // fetchArrivals will fetch the full station info including allPlatforms
    }
  }, [selectedStationId, primaryStation]);

  // Fetch arrivals for selected station (supports multiple platform IDs)
  const fetchArrivals = useCallback(async () => {
    if (!selectedStationId) return;

    setArrivals((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // First, fetch station info to get allPlatforms (for multi-complex stations)
      const stationRes = await fetch(`/api/stations?id=${encodeURIComponent(selectedStationId)}`);
      const stationData = await stationRes.json();
      
      let northPlatforms: string[] = [`${selectedStationId}N`];
      let southPlatforms: string[] = [`${selectedStationId}S`];
      
      if (stationData.success && stationData.data.stations.length > 0) {
        const station = stationData.data.stations[0];
        // Update state with station info
        setSelectedStationName(station.name);
        
        if (station.allPlatforms?.north?.length) {
          northPlatforms = station.allPlatforms.north;
        }
        if (station.allPlatforms?.south?.length) {
          southPlatforms = station.allPlatforms.south;
        }
        
      }

      // Fetch all platforms in parallel
      const northPromises = northPlatforms.map(id => 
        fetch(`/api/trains/realtime?stationId=${id}&limit=10`).then(r => r.json())
      );
      const southPromises = southPlatforms.map(id => 
        fetch(`/api/trains/realtime?stationId=${id}&limit=10`).then(r => r.json())
      );

      const [northResults, southResults] = await Promise.all([
        Promise.all(northPromises),
        Promise.all(southPromises),
      ]);

      // Parse arrival times back to Date objects
      const parseArrivals = (data: { arrivals: TrainArrival[] }): TrainArrival[] => {
        return (data.arrivals || []).map((arrival: TrainArrival) => ({
          ...arrival,
          arrivalTime: new Date(arrival.arrivalTime),
          departureTime: arrival.departureTime ? new Date(arrival.departureTime) : null,
        }));
      };

      // Combine and dedupe arrivals from all platforms
      const allNorth: TrainArrival[] = [];
      const allSouth: TrainArrival[] = [];
      const seenTrips = new Set<string>();

      for (const data of northResults) {
        if (data.success) {
          for (const arrival of parseArrivals(data.data)) {
            if (!seenTrips.has(arrival.tripId)) {
              seenTrips.add(arrival.tripId);
              allNorth.push(arrival);
            }
          }
        }
      }

      for (const data of southResults) {
        if (data.success) {
          for (const arrival of parseArrivals(data.data)) {
            if (!seenTrips.has(arrival.tripId)) {
              seenTrips.add(arrival.tripId);
              allSouth.push(arrival);
            }
          }
        }
      }

      // Sort by arrival time
      allNorth.sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime());
      allSouth.sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime());

      setArrivals({
        northbound: allNorth.slice(0, 10),
        southbound: allSouth.slice(0, 10),
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to fetch arrivals:", error);
      setArrivals((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch arrivals",
      }));
    }
  }, [selectedStationId]);

  // Fetch arrivals when station changes
  useEffect(() => {
    if (selectedStationId) {
      fetchArrivals();
    }
  }, [selectedStationId, fetchArrivals]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !selectedStationId) return;

    const interval = setInterval(fetchArrivals, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, selectedStationId, fetchArrivals]);

  const handleStationSelect = (stationId: string, stationName: string) => {
    setSelectedStationId(stationId);
    setSelectedStationName(stationName);
    // fetchArrivals will fetch full station info including allPlatforms
  };

  const handleToggleFavorite = () => {
    if (!selectedStationId || !selectedStationName) return;

    if (isFavorite(selectedStationId)) {
      removeFavorite(selectedStationId);
    } else {
      addFavorite(selectedStationId, selectedStationName);
    }
  };

  const isCurrentFavorite = selectedStationId ? isFavorite(selectedStationId) : false;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 pb-0">
        {/* Station Search */}
        <div className="w-full">
          <StationSearch
            onSelect={handleStationSelect}
            selectedId={selectedStationId}
            favoriteIds={favorites.map((f) => f.stationId)}
          />
        </div>

        {/* Station Header (when selected) */}
        {selectedStationId && selectedStationName && (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Train className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{selectedStationName}</h2>
                {arrivals.lastUpdated && (
                  <p className="text-xs text-foreground/50 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {formatDistanceToNow(arrivals.lastUpdated, { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className={isCurrentFavorite ? "text-warning" : "text-foreground/50"}
                onPress={handleToggleFavorite}
              >
                <Star className={`h-5 w-5 ${isCurrentFavorite ? "fill-current" : ""}`} />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={fetchArrivals}
                isLoading={arrivals.isLoading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardBody>
        {!selectedStationId ? (
          <div className="text-center py-8">
            <Train className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
            <p className="text-foreground/60">
              Search for a station above to see upcoming trains
            </p>
          </div>
        ) : arrivals.error ? (
          <div className="text-center py-8">
            <p className="text-danger mb-4">{arrivals.error}</p>
            <Button
              size="sm"
              variant="flat"
              startContent={<RefreshCw className="h-3 w-3" />}
              onPress={fetchArrivals}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Northbound */}
            <div>
              <ArrivalsList
                arrivals={arrivals.northbound}
                isLoading={arrivals.isLoading && arrivals.northbound.length === 0}
                directionLabel="Uptown & The Bronx"
                maxArrivals={5}
              />
            </div>

            <Divider />

            {/* Southbound */}
            <div>
              <ArrivalsList
                arrivals={arrivals.southbound}
                isLoading={arrivals.isLoading && arrivals.southbound.length === 0}
                directionLabel="Downtown & Brooklyn"
                maxArrivals={5}
              />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

