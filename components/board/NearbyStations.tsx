"use client";

/**
 * NearbyStations Component
 * 
 * Shows stations near the user's current location.
 * Includes option to add stations to favorites.
 */

import { useState, useEffect, useCallback } from "react";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { MapPin, Star, Navigation, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { formatDistance, formatWalkingTime, estimateWalkingTime } from "@/lib/utils/distance";

interface NearbyStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
}

interface NearbyStationsProps {
  /** Callback when a station is selected */
  onStationSelect: (stationId: string, stationName: string) => void;
  /** Callback when a station is favorited */
  onFavorite: (stationId: string, stationName: string) => void;
  /** Check if a station is already favorited */
  isFavorite: (stationId: string) => boolean;
  /** Initially collapsed state */
  defaultCollapsed?: boolean;
  /** Search radius in miles */
  radiusMiles?: number;
  /** Maximum stations to show */
  maxStations?: number;
}

export function NearbyStations({
  onStationSelect,
  onFavorite,
  isFavorite,
  defaultCollapsed = true,
  radiusMiles = 1,
  maxStations = 5,
}: NearbyStationsProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [stations, setStations] = useState<NearbyStation[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);

  const {
    position,
    error: geoError,
    isLoading: isLoadingGeo,
    permissionState,
    requestLocation,
  } = useGeolocation();

  // Fetch nearby stations when position changes
  const fetchNearbyStations = useCallback(async () => {
    if (!position) return;

    setIsLoadingStations(true);
    setStationsError(null);

    try {
      const response = await fetch(
        `/api/stations?near=${position.latitude},${position.longitude}&radius=${radiusMiles}&limit=${maxStations}`
      );
      const data = await response.json();

      if (data.success) {
        setStations(data.data.stations);
      } else {
        setStationsError(data.error || "Failed to load nearby stations");
      }
    } catch (error) {
      console.error("Failed to fetch nearby stations:", error);
      setStationsError("Failed to load nearby stations");
    } finally {
      setIsLoadingStations(false);
    }
  }, [position, radiusMiles, maxStations]);

  useEffect(() => {
    if (position) {
      fetchNearbyStations();
    }
  }, [position, fetchNearbyStations]);

  // Render location permission prompt
  const renderPermissionPrompt = () => {
    if (permissionState === "denied") {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-foreground/60 mb-2">
            Location access was denied.
          </p>
          <p className="text-xs text-foreground/50">
            Enable location in your browser settings to see nearby stations.
          </p>
        </div>
      );
    }

    if (permissionState === "unsupported") {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-foreground/60">
            Location is not supported by your browser.
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-4">
        <Button
          color="primary"
          variant="flat"
          startContent={<Navigation className="h-4 w-4" />}
          onPress={requestLocation}
          isLoading={isLoadingGeo}
        >
          Enable Location
        </Button>
        <p className="text-xs text-foreground/50 mt-2">
          Find subway stations near your current location
        </p>
      </div>
    );
  };

  // Render error state
  const renderError = () => (
    <div className="text-center py-4">
      <p className="text-sm text-danger mb-2">{geoError?.message || stationsError}</p>
      <Button
        size="sm"
        variant="flat"
        startContent={<RefreshCw className="h-3 w-3" />}
        onPress={requestLocation}
      >
        Try Again
      </Button>
    </div>
  );

  // Render stations list
  const renderStations = () => {
    if (stations.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-foreground/60">
            No stations found within {radiusMiles} mile{radiusMiles !== 1 ? "s" : ""}.
          </p>
          <Button
            size="sm"
            variant="flat"
            className="mt-2"
            startContent={<RefreshCw className="h-3 w-3" />}
            onPress={fetchNearbyStations}
          >
            Refresh
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {stations.map((station) => {
          const walkTime = estimateWalkingTime(station.distance);
          const isFav = isFavorite(station.id);

          return (
            <div
              key={station.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-default-100 transition-colors cursor-pointer"
              onClick={() => onStationSelect(station.id, station.name)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MapPin className="h-4 w-4 text-foreground/50 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{station.name}</p>
                  <p className="text-xs text-foreground/50">
                    {formatDistance(station.distance)} • {formatWalkingTime(walkTime)}
                  </p>
                </div>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className={isFav ? "text-warning" : "text-foreground/50"}
                onPress={() => {
                  onFavorite(station.id, station.name);
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Star className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  const hasLocation = position !== null;
  const showContent = !isCollapsed || !hasLocation;

  return (
    <Card>
      <CardBody className="p-0">
        {/* Header - always visible */}
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-default-50 transition-colors"
          onClick={() => hasLocation && setIsCollapsed(!isCollapsed)}
          disabled={!hasLocation}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Navigation className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="font-medium">Nearby Stations</p>
              {hasLocation && stations.length > 0 && (
                <p className="text-xs text-foreground/50">
                  {stations.length} station{stations.length !== 1 ? "s" : ""} within{" "}
                  {radiusMiles} mi
                </p>
              )}
            </div>
          </div>
          {hasLocation && (
            <div className="flex items-center gap-2">
              {isLoadingStations && <Spinner size="sm" />}
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4 text-foreground/50" />
              ) : (
                <ChevronUp className="h-4 w-4 text-foreground/50" />
              )}
            </div>
          )}
        </button>

        {/* Content */}
        {showContent && (
          <div className="px-4 pb-4">
            {!hasLocation && !geoError && renderPermissionPrompt()}
            {(geoError || stationsError) && renderError()}
            {hasLocation && !stationsError && !isLoadingStations && renderStations()}
            {hasLocation && isLoadingStations && (
              <div className="flex items-center justify-center py-6">
                <Spinner size="md" />
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

