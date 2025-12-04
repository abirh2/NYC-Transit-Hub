"use client";

/**
 * RailStationBoard Component
 * 
 * Main component for displaying train arrivals at a selected LIRR or Metro-North station.
 * Includes station search, arrivals by direction, and refresh functionality.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader, Button, Divider } from "@heroui/react";
import { RefreshCw, Star, Train, Clock } from "lucide-react";
import { RailStationSearch } from "./RailStationSearch";
import { RailArrivalsList } from "./RailArrivalsList";
import type { RailArrival, TransitMode } from "@/types/mta";
import { formatDistanceToNow } from "date-fns";

interface RailStationBoardProps {
  /** Transit mode (lirr or metro-north) */
  mode: TransitMode;
  /** Initially selected station ID (overrides preferences) */
  initialStationId?: string;
  /** Whether to auto-refresh arrivals */
  autoRefresh?: boolean;
  /** Refresh interval in seconds */
  refreshInterval?: number;
  /** Callback when station is favorited */
  onFavorite?: (stationId: string, stationName: string) => void;
  /** Callback when station is unfavorited */
  onUnfavorite?: (stationId: string) => void;
  /** Check if station is favorite */
  isFavorite?: (stationId: string) => boolean;
  /** Favorite station IDs for search highlighting */
  favoriteIds?: string[];
}

interface ArrivalsState {
  inbound: RailArrival[];
  outbound: RailArrival[];
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

export function RailStationBoard({
  mode,
  initialStationId,
  autoRefresh = true,
  refreshInterval = 30,
  onFavorite,
  onUnfavorite,
  isFavorite,
  favoriteIds = [],
}: RailStationBoardProps) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    initialStationId ?? null
  );
  const [selectedStationName, setSelectedStationName] = useState<string>("");
  const [arrivals, setArrivals] = useState<ArrivalsState>({
    inbound: [],
    outbound: [],
    lastUpdated: null,
    isLoading: false,
    error: null,
  });

  // API endpoint based on mode
  const apiEndpoint = mode === "lirr" ? "/api/lirr/realtime" : "/api/metro-north/realtime";
  const terminalName = mode === "lirr" ? "Penn Station" : "Grand Central";
  const modeLabel = mode === "lirr" ? "LIRR" : "Metro-North";

  // Fetch arrivals for selected station
  const fetchArrivals = useCallback(async () => {
    if (!selectedStationId) return;

    setArrivals((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `${apiEndpoint}?stopId=${selectedStationId}&limit=20`
      );
      const data = await response.json();

      if (data.success && data.data?.arrivals) {
        // Parse arrival times back to Date objects
        const allArrivals: RailArrival[] = data.data.arrivals.map((arrival: RailArrival) => ({
          ...arrival,
          arrivalTime: new Date(arrival.arrivalTime),
          departureTime: arrival.departureTime ? new Date(arrival.departureTime) : null,
        }));

        // Split by direction
        const inbound = allArrivals.filter((a) => a.direction === "inbound");
        const outbound = allArrivals.filter((a) => a.direction === "outbound");

        // Sort each by arrival time
        inbound.sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime());
        outbound.sort((a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime());

        setArrivals({
          inbound,
          outbound,
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(data.error || "Failed to fetch arrivals");
      }
    } catch (error) {
      console.error("Failed to fetch rail arrivals:", error);
      setArrivals((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch arrivals",
      }));
    }
  }, [selectedStationId, apiEndpoint]);

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

  // Clear arrivals when mode changes
  useEffect(() => {
    setSelectedStationId(null);
    setSelectedStationName("");
    setArrivals({
      inbound: [],
      outbound: [],
      lastUpdated: null,
      isLoading: false,
      error: null,
    });
  }, [mode]);

  const handleStationSelect = (stationId: string, stationName: string) => {
    setSelectedStationId(stationId);
    setSelectedStationName(stationName);
  };

  const handleToggleFavorite = () => {
    if (!selectedStationId || !selectedStationName) return;

    if (isFavorite?.(selectedStationId)) {
      onUnfavorite?.(selectedStationId);
    } else {
      onFavorite?.(selectedStationId, selectedStationName);
    }
  };

  const isCurrentFavorite = selectedStationId ? isFavorite?.(selectedStationId) : false;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 pb-0">
        {/* Station Search */}
        <div className="w-full">
          <RailStationSearch
            mode={mode}
            onSelect={handleStationSelect}
            selectedId={selectedStationId}
            favoriteIds={favoriteIds}
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
              {onFavorite && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className={isCurrentFavorite ? "text-warning" : "text-foreground/50"}
                  onPress={handleToggleFavorite}
                >
                  <Star className={`h-5 w-5 ${isCurrentFavorite ? "fill-current" : ""}`} />
                </Button>
              )}
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
              Search for a {modeLabel} station above to see upcoming trains
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
            {/* Inbound */}
            <div>
              <RailArrivalsList
                arrivals={arrivals.inbound}
                mode={mode}
                isLoading={arrivals.isLoading && arrivals.inbound.length === 0}
                directionLabel={`Inbound to ${terminalName}`}
                maxArrivals={5}
              />
            </div>

            <Divider />

            {/* Outbound */}
            <div>
              <RailArrivalsList
                arrivals={arrivals.outbound}
                mode={mode}
                isLoading={arrivals.isLoading && arrivals.outbound.length === 0}
                directionLabel={`Outbound from ${terminalName}`}
                maxArrivals={5}
              />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

