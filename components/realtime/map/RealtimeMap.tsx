"use client";

/**
 * RealtimeMap
 *
 * The map surface for the Realtime page: owns the non-Leaflet concerns
 * (loading / empty / error / stale states, imperative fit and recenter, the
 * floating control stack and legend) and delegates rendering to
 * `RealtimeMapCanvas`, which is loaded client-side only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngBoundsExpression, Map as LeafletMap } from "leaflet";
import { MapPin, RadioTower, WifiOff } from "lucide-react";
import { Spinner } from "@heroui/react";
import { EmptyState, ErrorState } from "@/components/ui";
import type { BusArrival, RailArrival, TransitMode } from "@/types/mta";
import type { Departure, SubwayTrip } from "@/types/transit";
import type { StationWithCoords } from "@/lib/utils/train-positioning";
import {
  getRenderableSubwayGeometries,
} from "@/lib/gtfs/subway-route-geometry";
import type { GeolocationPosition, GeolocationPermissionState } from "@/lib/hooks/useGeolocation";
import { useSubwayRouteGeometry } from "@/lib/hooks/useSubwayRouteGeometry";
import { MapControls } from "./MapControls";
import { MapLegend } from "./MapLegend";

/**
 * Leaflet touches `window` at import time, so the entire canvas — including
 * its own `react-leaflet` imports — is deferred to the client.
 */
const RealtimeMapCanvas = dynamic(() => import("./RealtimeMapCanvas"), {
  ssr: false,
  loading: () => <MapCanvasFallback />,
});

function MapCanvasFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-surface-app"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <span className="text-sm text-foreground/60">Loading map…</span>
      </div>
    </div>
  );
}

/** Zoom used when framing a single point (e.g. the user's location). */
const POINT_ZOOM = 15;

export interface RealtimeMapProps {
  mode: TransitMode;
  routeId: string | null;
  routeColor: string;
  routeLabel: string;
  stations: StationWithCoords[];
  subwayTrips?: SubwayTrip[];
  subwayDepartures?: Departure[];
  railTrains?: RailArrival[];
  buses?: BusArrival[];
  busRouteShape?: [number, number][];
  isLoading?: boolean;
  error?: string | null;
  /** True when the last successful refresh is old enough to distrust. */
  isStale?: boolean;
  /** Count of vehicles currently plotted, used for the no-vehicles notice. */
  vehicleCount?: number;
  selectedStationId?: string;
  selectedVehicleId?: string;
  onSelectStation: (stationId: string | null) => void;
  onSelectVehicle: (vehicleId: string | null) => void;
  onRetry?: () => void;
  userLocation: GeolocationPosition | null;
  locationPermission: GeolocationPermissionState;
  isLocating: boolean;
  onRequestLocation: () => void;
}

export function RealtimeMap({
  mode,
  routeId,
  routeColor,
  routeLabel,
  stations,
  subwayTrips = [],
  subwayDepartures = [],
  railTrains = [],
  buses = [],
  busRouteShape = [],
  isLoading = false,
  error = null,
  isStale = false,
  vehicleCount = 0,
  selectedStationId,
  selectedVehicleId,
  onSelectStation,
  onSelectVehicle,
  onRetry,
  userLocation,
  locationPermission,
  isLocating,
  onRequestLocation,
}: RealtimeMapProps) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const subwayGeometryState = useSubwayRouteGeometry(
    mode === "subway" ? routeId : null,
  );
  const subwayGeometry = subwayGeometryState.artifact;

  /** Every coordinate worth framing for the active route. */
  const routeBounds = useMemo<LatLngBoundsExpression | null>(() => {
    const points: [number, number][] = [];

    if (mode === "bus" && busRouteShape.length > 0) {
      points.push(...busRouteShape);
    }
    if (mode === "subway" && subwayGeometry) {
      for (const geometry of getRenderableSubwayGeometries(
        subwayTrips,
        subwayGeometry,
        selectedVehicleId,
      )) {
        points.push(...geometry.shape.coordinates);
      }
    }
    for (const station of stations) {
      if (station.lat && station.lon) points.push([station.lat, station.lon]);
    }
    if (mode === "bus") {
      for (const bus of buses) {
        if (bus.latitude && bus.longitude) points.push([bus.latitude, bus.longitude]);
      }
    }

    return points.length > 0 ? points : null;
  }, [
    mode,
    stations,
    subwayTrips,
    subwayGeometry,
    selectedVehicleId,
    busRouteShape,
    buses,
  ]);

  const fitRoute = useCallback(() => {
    if (!map || !routeBounds) return;
    map.fitBounds(routeBounds, { padding: [48, 48], animate: true });
  }, [map, routeBounds]);

  /**
   * Frame the route whenever the selection changes, replacing the previous
   * bounding-box centroid at a fixed zoom, which let long lines render mostly
   * off-screen. Keyed on mode+route so panning within a route is not undone.
   */
  const framedKey = useRef<string | null>(null);
  const geometryVersion = subwayGeometry?.source.feedVersion ?? "fallback";
  useEffect(() => {
    if (!map || !routeBounds || !routeId) return;
    const key = `${mode}:${routeId}:${geometryVersion}`;
    if (framedKey.current === key) return;
    framedKey.current = key;
    map.fitBounds(routeBounds, { padding: [48, 48], animate: false });
  }, [map, routeBounds, routeId, mode, geometryVersion]);

  /** Leaflet needs a nudge when its container is resized by the layout. */
  useEffect(() => {
    if (!map) return;
    const observed = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(observed);
    return () => observer.disconnect();
  }, [map]);

  const recenterUser = useCallback(() => {
    if (userLocation) {
      map?.setView([userLocation.latitude, userLocation.longitude], POINT_ZOOM, {
        animate: true,
      });
      return;
    }
    // Only ask for permission on an explicit press, never on page load.
    onRequestLocation();
  }, [map, userLocation, onRequestLocation]);

  /** Center on the user the first time a fix arrives after they asked. */
  const centeredOnUser = useRef(false);
  useEffect(() => {
    if (!map || !userLocation || centeredOnUser.current) return;
    centeredOnUser.current = true;
    map.setView([userLocation.latitude, userLocation.longitude], POINT_ZOOM, {
      animate: true,
    });
  }, [map, userLocation]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <ErrorState
          title="Live data unavailable"
          description={error}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (!routeId) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <EmptyState
          icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
          title={
            mode === "bus" ? "Choose a bus route" : "Choose a route to explore"
          }
          description="Pick a route above to plot its stations and live vehicles on the map."
        />
      </div>
    );
  }

  if (stations.length === 0 && busRouteShape.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <EmptyState
          icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
          title="No map geometry for this route"
          description={`We do not have station coordinates for ${routeLabel} yet. Switch to the diagram view to see live arrivals.`}
        />
      </div>
    );
  }

  return (
    <div className="rt-map relative h-full w-full overflow-hidden">
      <RealtimeMapCanvas
        mode={mode}
        routeId={routeId}
        routeColor={routeColor}
        stations={stations}
        subwayTrips={subwayTrips}
        subwayDepartures={subwayDepartures}
        subwayGeometry={subwayGeometry}
        railTrains={railTrains}
        buses={buses}
        busRouteShape={busRouteShape}
        selectedStationId={selectedStationId}
        selectedVehicleId={selectedVehicleId}
        isStale={isStale}
        userLocation={userLocation}
        onSelectStation={onSelectStation}
        onSelectVehicle={onSelectVehicle}
        onMapReady={setMap}
      />

      <MapControls
        map={map}
        canFitRoute={routeBounds !== null}
        onFitRoute={fitRoute}
        onRecenterUser={recenterUser}
        hasUserLocation={userLocation !== null}
        isLocating={isLocating}
        locationPermission={locationPermission}
        onToggleLegend={() => setIsLegendOpen((open) => !open)}
        isLegendOpen={isLegendOpen}
      />

      {isLegendOpen && (
        <MapLegend mode={mode} onClose={() => setIsLegendOpen(false)} />
      )}

      {/* Status strip: stacked notices for the conditions a live map has to be
          honest about. Kept to the bottom-left so it never covers controls. */}
      <div className="pointer-events-none absolute bottom-0 left-0 z-[500] flex max-w-[min(20rem,70%)] flex-col items-start gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]">
        {isStale && (
          <MapNotice
            icon={<WifiOff className="h-3.5 w-3.5" aria-hidden="true" />}
            tone="stale"
            text="Live data may be out of date"
          />
        )}
        {!isLoading && !isStale && vehicleCount === 0 && (
          <MapNotice
            icon={<RadioTower className="h-3.5 w-3.5" aria-hidden="true" />}
            tone="neutral"
            text={`No ${mode === "bus" ? "buses" : "trains"} reporting on ${routeLabel} right now`}
          />
        )}
      </div>

      {isLoading && (
        <div
          className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-pill border border-border-strong bg-surface-floating px-3 py-1.5"
          style={{ boxShadow: "var(--shadow-md)" }}
          role="status"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-foreground/80">
            <Spinner size="sm" />
            Updating live positions…
          </span>
        </div>
      )}
    </div>
  );
}

function MapNotice({
  icon,
  text,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  tone: "stale" | "neutral";
}) {
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center gap-2 rounded-pill border px-3 py-1.5 text-xs font-medium ${
        tone === "stale"
          ? "border-state-stale/40 bg-surface-floating text-state-stale"
          : "border-border-strong bg-surface-floating text-foreground/70"
      }`}
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}
