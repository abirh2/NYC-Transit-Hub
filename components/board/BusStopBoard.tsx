"use client";

/**
 * BusStopBoard Component
 * 
 * Uses geolocation to show nearby buses and their arrival times.
 * Groups buses by route and shows ETAs.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader, Button, Spinner } from "@heroui/react";
import { RefreshCw, Clock, Bus, Navigation, MapPin, WifiOff } from "lucide-react";
import { BusArrivalsList } from "./BusArrivalsList";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { haversineDistance } from "@/lib/utils/distance";
import type { BusArrival } from "@/types/mta";
import { formatDistanceToNow } from "date-fns";

interface BusStopBoardProps {
  /** Whether to auto-refresh arrivals */
  autoRefresh?: boolean;
  /** Refresh interval in seconds */
  refreshInterval?: number;
  /** Max distance in miles to show buses */
  maxDistanceMiles?: number;
}

interface BusData {
  arrivals: BusArrival[];
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

export function BusStopBoard({
  autoRefresh = true,
  refreshInterval = 30,
  maxDistanceMiles = 0.5,
}: BusStopBoardProps) {
  const {
    position,
    error: geoError,
    isLoading: isLoadingGeo,
    permissionState,
    requestLocation,
  } = useGeolocation();

  const [busData, setBusData] = useState<BusData>({
    arrivals: [],
    lastUpdated: null,
    isLoading: false,
    error: null,
  });

  // Fetch nearby buses
  const fetchNearbyBuses = useCallback(async () => {
    if (!position) return;

    setBusData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch all active buses (will filter by distance)
      const response = await fetch(`/api/buses/realtime?limit=200`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch bus data");
      }

      if (!data.data?.arrivals) {
        setBusData({
          arrivals: [],
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        });
        return;
      }

      // Filter buses by distance from user
      const nearbyBuses: BusArrival[] = [];
      
      for (const arrival of data.data.arrivals) {
        // Skip buses without position data
        if (!arrival.latitude || !arrival.longitude) continue;

        const distance = haversineDistance(
          position.latitude,
          position.longitude,
          arrival.latitude,
          arrival.longitude
        );

        if (distance <= maxDistanceMiles) {
          // Parse arrival time if it's a string
          const parsedArrival: BusArrival = {
            ...arrival,
            arrivalTime: arrival.arrivalTime ? new Date(arrival.arrivalTime) : null,
          };
          
          // Add distance in meters for display
          parsedArrival.distanceFromStop = distance * 1609.34; // Convert miles to meters
          
          nearbyBuses.push(parsedArrival);
        }
      }

      // Sort by distance
      nearbyBuses.sort((a, b) => {
        const distA = a.distanceFromStop ?? Infinity;
        const distB = b.distanceFromStop ?? Infinity;
        return distA - distB;
      });

      setBusData({
        arrivals: nearbyBuses,
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to fetch nearby buses:", error);
      setBusData((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch bus data",
      }));
    }
  }, [position, maxDistanceMiles]);

  // Fetch when position changes
  useEffect(() => {
    if (position) {
      fetchNearbyBuses();
    }
  }, [position, fetchNearbyBuses]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !position) return;

    const interval = setInterval(fetchNearbyBuses, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, position, fetchNearbyBuses]);

  // Permission states
  const renderPermissionPrompt = () => {
    if (permissionState === "denied") {
      return (
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Location Access Denied
          </h3>
          <p className="text-foreground/60 text-sm max-w-md mx-auto">
            To see nearby buses, please enable location access in your browser settings.
          </p>
        </div>
      );
    }

    if (permissionState === "unsupported") {
      return (
        <div className="text-center py-8">
          <WifiOff className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Location Not Supported
          </h3>
          <p className="text-foreground/60 text-sm max-w-md mx-auto">
            Your browser doesn&apos;t support location services.
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <Navigation className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Find Nearby Buses
        </h3>
        <p className="text-foreground/60 text-sm max-w-md mx-auto mb-4">
          Enable location access to see buses near your current location.
        </p>
        <Button
          color="primary"
          startContent={<MapPin className="h-4 w-4" />}
          onPress={requestLocation}
          isLoading={isLoadingGeo}
        >
          Enable Location
        </Button>
      </div>
    );
  };

  // Group buses by route for display
  const groupedByRoute = new Map<string, BusArrival[]>();
  for (const bus of busData.arrivals) {
    const existing = groupedByRoute.get(bus.routeId) ?? [];
    existing.push(bus);
    groupedByRoute.set(bus.routeId, existing);
  }

  const hasLocation = position !== null;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 pb-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nearby Buses</h2>
              {hasLocation && busData.lastUpdated && (
                <p className="text-xs text-foreground/50 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {formatDistanceToNow(busData.lastUpdated, { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          {hasLocation && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={fetchNearbyBuses}
              isLoading={busData.isLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardBody>
        {!hasLocation ? (
          renderPermissionPrompt()
        ) : busData.isLoading && busData.arrivals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner size="lg" />
            <p className="mt-4 text-foreground/60 text-sm">Finding nearby buses...</p>
          </div>
        ) : geoError ? (
          <div className="text-center py-8">
            <p className="text-danger mb-4">{geoError.message}</p>
            <Button
              size="sm"
              variant="flat"
              startContent={<RefreshCw className="h-3 w-3" />}
              onPress={requestLocation}
            >
              Try Again
            </Button>
          </div>
        ) : busData.error ? (
          <div className="text-center py-8">
            <p className="text-danger mb-4">{busData.error}</p>
            <Button
              size="sm"
              variant="flat"
              startContent={<RefreshCw className="h-3 w-3" />}
              onPress={fetchNearbyBuses}
            >
              Try Again
            </Button>
          </div>
        ) : busData.arrivals.length === 0 ? (
          <div className="text-center py-8">
            <Bus className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Buses Nearby
            </h3>
            <p className="text-foreground/60 text-sm max-w-md mx-auto">
              No buses found within {maxDistanceMiles} mile{maxDistanceMiles !== 1 ? "s" : ""} of your location.
              Try refreshing or increasing the search radius.
            </p>
            <Button
              size="sm"
              variant="flat"
              className="mt-4"
              startContent={<RefreshCw className="h-3 w-3" />}
              onPress={fetchNearbyBuses}
            >
              Refresh
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-foreground/50">
              {busData.arrivals.length} bus{busData.arrivals.length !== 1 ? "es" : ""} within {maxDistanceMiles} mi
            </p>
            <BusArrivalsList
              arrivals={busData.arrivals}
              groupByRoute={true}
              maxArrivals={20}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

