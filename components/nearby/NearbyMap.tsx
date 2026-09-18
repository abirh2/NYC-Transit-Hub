"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Map as LeafletMap } from "leaflet";
import { LocateFixed, Minimize2, Search } from "lucide-react";

import { useSubwayRouteGeometry } from "@/lib/hooks/useSubwayRouteGeometry";
import { getBusRouteColor } from "@/lib/gtfs/bus-routes";
import {
  projectTripOnSubwayGeometry,
  resolveGeometryForTrip,
} from "@/lib/gtfs/subway-route-geometry";
import { getSubwayRouteColor } from "@/lib/transit/route-colors";
import type { GeolocationPosition } from "@/lib/hooks/useGeolocation";
import type { NearbyService } from "@/lib/transit/nearby";
import type {
  NearbyBusRealtimeResult,
  NearbyBusStopGroup,
  SubwayTrip,
  TransitStation,
  TransitVehicle,
} from "@/types/transit";

const NearbyMapCanvas = dynamic(() => import("./NearbyMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-surface-elevated" aria-label="Loading nearby map" />
  ),
});

interface NearbyMapProps {
  position: GeolocationPosition;
  stations: Array<TransitStation & { distance: number }>;
  busGroups: NearbyBusStopGroup[];
  selectedService: NearbyService | null;
  subwayTrips: SubwayTrip[];
  busResults: NearbyBusRealtimeResult[];
  expanded: boolean;
  onCollapse: () => void;
  onSelectLocation: (locationId: string) => void;
}

export function NearbyMap({
  position,
  stations,
  busGroups,
  selectedService,
  subwayTrips,
  busResults,
  expanded,
  onCollapse,
  onSelectLocation,
}: NearbyMapProps) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [busRouteShape, setBusRouteShape] = useState<[number, number][]>([]);
  const selectedRouteId = selectedService?.departure.routeId ?? null;
  const subwayGeometryState = useSubwayRouteGeometry(
    selectedService?.mode === "subway" ? selectedRouteId : null,
  );

  const selectedSubwayTrip = useMemo(() => (
    selectedService?.mode === "subway"
      ? subwayTrips.find((trip) => trip.id === selectedService.departure.tripId) ?? null
      : null
  ), [selectedService, subwayTrips]);

  const selectedSubwayGeometry = useMemo(() => (
    selectedSubwayTrip && subwayGeometryState.artifact
      ? resolveGeometryForTrip(selectedSubwayTrip, subwayGeometryState.artifact)
      : null
  ), [selectedSubwayTrip, subwayGeometryState.artifact]);

  const selectedTrainPosition = useMemo(() => (
    selectedSubwayTrip && selectedSubwayGeometry
      ? projectTripOnSubwayGeometry(selectedSubwayTrip, selectedSubwayGeometry)?.coordinates ?? null
      : null
  ), [selectedSubwayGeometry, selectedSubwayTrip]);

  const otherSubwayTrainPositions = useMemo(() => {
    const artifact = subwayGeometryState.artifact;
    if (
      selectedService?.mode !== "subway" ||
      !artifact ||
      !expanded
    ) return [];

    return subwayTrips.flatMap((trip) => {
      if (trip.id === selectedSubwayTrip?.id || trip.route.id !== selectedRouteId) return [];
      const geometry = resolveGeometryForTrip(trip, artifact);
      const projected = geometry ? projectTripOnSubwayGeometry(trip, geometry) : null;
      return projected ? [{
        tripId: trip.id,
        routeId: trip.route.id,
        direction: trip.direction,
        destination: trip.destination,
        coordinates: projected.coordinates,
      }] : [];
    }).slice(0, 6);
  }, [
    expanded,
    selectedRouteId,
    selectedService?.mode,
    selectedSubwayTrip?.id,
    subwayGeometryState.artifact,
    subwayTrips,
  ]);

  const selectedBusVehicle = useMemo<TransitVehicle | null>(() => {
    if (selectedService?.mode !== "bus") return null;
    const trips = busResults.flatMap((result) => result.trips);
    const vehicles = busResults.flatMap((result) => result.vehicles);
    const trip = trips.find((candidate) => candidate.id === selectedService.departure.tripId);
    if (!trip?.vehicleId) return null;
    return vehicles.find((vehicle) =>
      vehicle.id === trip.vehicleId && vehicle.position.source === "actual") ?? null;
  }, [busResults, selectedService]);

  useEffect(() => {
    let cancelled = false;
    if (selectedService?.mode !== "bus") {
      setBusRouteShape([]);
      return () => { cancelled = true; };
    }

    void import("@/lib/gtfs/bus-stops").then(({ getBusRouteShape }) => {
      if (!cancelled) setBusRouteShape(getBusRouteShape(selectedService.departure.routeId));
    });
    return () => { cancelled = true; };
  }, [selectedService]);

  const routeGeometry = selectedService?.mode === "subway"
    ? selectedSubwayGeometry?.shape.coordinates ?? []
    : busRouteShape;
  const routeColor = selectedService?.mode === "subway"
    ? getSubwayRouteColor(selectedRouteId ?? "")
    : selectedService?.mode === "bus"
      ? getBusRouteColor(selectedRouteId ?? "")
      : "#0039A6";

  const recenter = useCallback(() => {
    map?.setView([position.latitude, position.longitude], 15, { animate: true });
  }, [map, position.latitude, position.longitude]);

  return (
    <section
      id="nearby-map"
      role="region"
      aria-label="Nearby map"
      data-expanded={expanded}
      className={`rt-map relative overflow-hidden bg-surface-elevated motion-safe:transition-[height] motion-safe:duration-300 lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)] lg:max-h-none lg:rounded-lg ${
        expanded
          ? "h-[46dvh] min-h-80 max-h-[32rem]"
          : "h-[40dvh] min-h-72 max-h-[26rem]"
      }`}
    >
      <NearbyMapCanvas
        position={position}
        stations={stations}
        busGroups={busGroups}
        selectedService={selectedService}
        selectedTrainPosition={selectedTrainPosition}
        otherSubwayTrainPositions={otherSubwayTrainPositions}
        focusSelectedTrain={expanded}
        selectedBusVehicle={selectedBusVehicle}
        routeGeometry={routeGeometry}
        routeColor={routeColor}
        onSelectLocation={onSelectLocation}
        onMapReady={setMap}
      />

      <button
        type="button"
        onClick={recenter}
        aria-label="Center map on my location"
        className="absolute right-3 top-3 z-[500] flex h-11 w-11 items-center justify-center rounded-pill border border-border-strong bg-surface-floating text-foreground shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <LocateFixed className="h-5 w-5" aria-hidden="true" />
      </button>

      {expanded && (
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse train map"
          className="absolute left-3 top-3 z-[500] flex h-11 items-center gap-2 rounded-pill border border-border-strong bg-surface-floating px-3 text-sm font-semibold text-foreground shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Minimize2 className="h-4 w-4" aria-hidden="true" />
          <span>Times</span>
        </button>
      )}

      <div className="absolute inset-x-3 bottom-6 z-[500]">
        <Link
          href="/routes"
          aria-label="Plan a trip"
          className="flex min-h-14 items-center gap-3 rounded-lg bg-surface-floating px-4 text-base font-semibold text-foreground shadow-[var(--shadow-lg)] transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Search className="h-5 w-5 text-state-selected" aria-hidden="true" />
          <span className="flex-1">Where to?</span>
          <span className="text-xs font-medium text-foreground/55">Plan</span>
        </Link>
      </div>
    </section>
  );
}
