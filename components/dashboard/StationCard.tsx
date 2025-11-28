"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader, Spinner, Button } from "@heroui/react";
import { TrainFront, ArrowRight, Settings, RefreshCw, MapPin } from "lucide-react";
import Link from "next/link";
import { SubwayBullet } from "@/components/ui";
import { useStationPreferences } from "@/lib/hooks/useStationPreferences";

interface Departure {
  line: string;
  destination: string;
  time: string;
  direction: "N" | "S";
}

export function StationCard() {
  const { primaryStation, isLoaded } = useStationPreferences();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartures = useCallback(async () => {
    if (!primaryStation) return;

    setIsLoading(true);
    setError(null);

    try {
      // First, get the full station info to get all platform IDs
      // (for stations like Times Sq with multiple complexes)
      const stationRes = await fetch(
        `/api/stations?search=${encodeURIComponent(primaryStation.stationName)}&limit=1`
      );
      const stationData = await stationRes.json();
      
      let northPlatforms = [`${primaryStation.stationId}N`];
      let southPlatforms = [`${primaryStation.stationId}S`];
      
      // If we got allPlatforms, use all of them
      if (stationData.success && stationData.data.stations.length > 0) {
        const station = stationData.data.stations[0];
        if (station.allPlatforms?.north?.length) {
          northPlatforms = station.allPlatforms.north;
        }
        if (station.allPlatforms?.south?.length) {
          southPlatforms = station.allPlatforms.south;
        }
      }

      // Fetch all platforms in parallel
      const northPromises = northPlatforms.map(id =>
        fetch(`/api/trains/realtime?stationId=${id}&limit=5`).then(r => r.json())
      );
      const southPromises = southPlatforms.map(id =>
        fetch(`/api/trains/realtime?stationId=${id}&limit=5`).then(r => r.json())
      );

      const [northResults, southResults] = await Promise.all([
        Promise.all(northPromises),
        Promise.all(southPromises),
      ]);

      const allDepartures: Departure[] = [];
      const seenTrips = new Set<string>();

      // Process northbound arrivals from all platforms
      for (const northData of northResults) {
        if (northData.success && northData.data?.arrivals) {
          for (const arrival of northData.data.arrivals) {
            if (seenTrips.has(arrival.tripId)) continue;
            seenTrips.add(arrival.tripId);
            allDepartures.push({
              line: arrival.routeId,
              destination: arrival.headsign || getDefaultHeadsign(arrival.routeId, "N"),
              time: formatMinutesAway(arrival.minutesAway),
              direction: "N",
            });
          }
        }
      }

      // Process southbound arrivals from all platforms
      for (const southData of southResults) {
        if (southData.success && southData.data?.arrivals) {
          for (const arrival of southData.data.arrivals) {
            if (seenTrips.has(arrival.tripId)) continue;
            seenTrips.add(arrival.tripId);
            allDepartures.push({
              line: arrival.routeId,
              destination: arrival.headsign || getDefaultHeadsign(arrival.routeId, "S"),
              time: formatMinutesAway(arrival.minutesAway),
              direction: "S",
            });
          }
        }
      }

      // Sort by time
      allDepartures.sort((a, b) => {
        const aMin = parseMinutes(a.time);
        const bMin = parseMinutes(b.time);
        return aMin - bMin;
      });

      setDepartures(allDepartures.slice(0, 4));
    } catch (err) {
      console.error("Failed to fetch departures:", err);
      setError("Failed to load arrivals");
    } finally {
      setIsLoading(false);
    }
  }, [primaryStation]);

  // Fetch on mount and when primary station changes
  useEffect(() => {
    if (isLoaded && primaryStation) {
      fetchDepartures();
    }
  }, [isLoaded, primaryStation, fetchDepartures]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!primaryStation) return;

    const interval = setInterval(fetchDepartures, 30000);
    return () => clearInterval(interval);
  }, [primaryStation, fetchDepartures]);

  // No station configured
  if (isLoaded && !primaryStation) {
    return (
      <Card className="h-full">
        <CardHeader className="flex justify-between items-start pb-2">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrainFront className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Your Station</p>
              <p className="text-sm text-foreground/50">Not configured</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="text-center py-6">
            <MapPin className="h-10 w-10 mx-auto text-foreground/30 mb-3" />
            <p className="text-foreground/60 mb-4">
              Set your home station to see upcoming trains
            </p>
            <Link href="/board">
              <Button color="primary" size="sm">
                Choose Station
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Loading preferences
  if (!isLoaded) {
    return (
      <Card className="h-full">
        <CardBody className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex justify-between items-start pb-2">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrainFront className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold">Your Station</p>
            <p className="text-sm text-foreground/50">{primaryStation?.stationName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={fetchDepartures}
            isLoading={isLoading}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Link
            href="/board"
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        {isLoading && departures.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-danger text-sm mb-3">{error}</p>
            <Button size="sm" variant="flat" onPress={fetchDepartures}>
              Retry
            </Button>
          </div>
        ) : departures.length === 0 ? (
          <div className="text-center py-6 text-foreground/60">
            <p>No upcoming trains</p>
          </div>
        ) : (
          <div className="space-y-3">
            {departures.map((dep, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SubwayBullet line={dep.line} size="md" />
                  <span className="text-foreground/80 text-sm truncate max-w-[150px]">
                    {dep.destination}
                  </span>
                </div>
                <span
                  className={`font-medium ${
                    dep.time === "Now"
                      ? "text-success"
                      : parseMinutes(dep.time) <= 5
                      ? "text-warning"
                      : "text-foreground"
                  }`}
                >
                  {dep.time}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-divider">
          <Link
            href="/board"
            className="text-sm text-foreground/50 flex items-center gap-1 hover:text-foreground"
          >
            <Settings className="h-3 w-3" /> Configure stations
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Format minutes away for display
 */
function formatMinutesAway(minutes: number): string {
  if (minutes <= 0) return "Now";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}

/**
 * Parse minutes from formatted string
 */
function parseMinutes(time: string): number {
  if (time === "Now") return 0;
  const match = time.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 999;
}

/**
 * Get default headsign for a line and direction
 */
function getDefaultHeadsign(routeId: string, direction: "N" | "S"): string {
  const terminals: Record<string, { N: string; S: string }> = {
    "1": { N: "Van Cortlandt Park", S: "South Ferry" },
    "2": { N: "Wakefield", S: "Flatbush Av" },
    "3": { N: "Harlem-148 St", S: "New Lots Av" },
    "4": { N: "Woodlawn", S: "Crown Hts" },
    "5": { N: "Dyre Av", S: "Flatbush Av" },
    "6": { N: "Pelham Bay Park", S: "Brooklyn Bridge" },
    "7": { N: "Flushing", S: "34 St-Hudson Yards" },
    A: { N: "Inwood", S: "Far Rockaway" },
    C: { N: "168 St", S: "Euclid Av" },
    E: { N: "Jamaica Center", S: "World Trade Center" },
    B: { N: "Bedford Park", S: "Brighton Beach" },
    D: { N: "Norwood", S: "Coney Island" },
    F: { N: "Jamaica", S: "Coney Island" },
    M: { N: "Forest Hills", S: "Middle Village" },
    G: { N: "Court Sq", S: "Church Av" },
    J: { N: "Jamaica Center", S: "Broad St" },
    Z: { N: "Jamaica Center", S: "Broad St" },
    L: { N: "8 Av", S: "Canarsie" },
    N: { N: "Astoria", S: "Coney Island" },
    Q: { N: "96 St", S: "Coney Island" },
    R: { N: "Forest Hills", S: "Bay Ridge" },
    W: { N: "Astoria", S: "Whitehall St" },
  };

  return terminals[routeId]?.[direction] || (direction === "N" ? "Uptown" : "Downtown");
}
