"use client";

/**
 * RealtimeMapCanvas
 *
 * The Leaflet layer of the Realtime map. This module imports `react-leaflet`
 * and `leaflet` at the top level, which is only safe because it is *always*
 * loaded through `dynamic(..., { ssr: false })` from `RealtimeMap`. Doing it
 * this way (rather than wrapping each react-leaflet primitive in its own
 * `dynamic()` call) means hooks such as `useMap` are usable, which is what
 * makes zoom-dependent labeling and imperative fit/recenter possible.
 *
 * Layer hierarchy is declared explicitly through Leaflet panes rather than
 * left to render order:
 *
 *   base map (200) < route (400) < stations (450) < vehicles (600) < selected (650)
 */

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Pane,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L, { type Map as LeafletMap } from "leaflet";
import { useTheme } from "next-themes";
import "leaflet/dist/leaflet.css";

import type { RailArrival, TransitMode } from "@/types/mta";
import type { BusTrip, Departure, SubwayTrip, TransitVehicle } from "@/types/transit";
import {
  getRenderableSubwayGeometries,
  projectTripOnSubwayGeometry,
  resolveGeometryForTrip,
  type SubwayGeometryArtifact,
} from "@/lib/gtfs/subway-route-geometry";
import { getDirectionLabel } from "@/lib/transit/direction";
import { projectSubwayTripPosition } from "@/lib/transit/subway-trip-position";
import {
  calculateStationDistances,
  interpolateTrainPosition,
  staggerTrainPositions,
  type StationWithCoords,
} from "@/lib/utils/train-positioning";

// Subway routes use compact, route-scoped GTFS shape artifacts when available;
// station-to-station geometry remains the safe fallback for missing or
// unresolved static data. Bus shapes and realtime vehicle semantics stay on
// their existing paths.
import {
  buildBusMarkerHtml,
  buildRailMarkerHtml,
  buildSubwayMarkerHtml,
  buildUserLocationHtml,
  getBearingDegrees,
  getMarkerStatus,
  type MarkerVisual,
} from "./markerIcons";

/** Fallback view when there is no route to frame. */
const NYC_CENTER: [number, number] = [40.7128, -74.006];
const NYC_ZOOM = 11;

/**
 * Zoom at which station labels appear. Below this a full line's labels overlap
 * into noise, so only the selected station keeps its label.
 */
const STATION_LABEL_ZOOM = 13;

/** Pane z-indices. Leaflet's own overlay pane sits at 400. */
const PANES = {
  route: { name: "rt-route", zIndex: 400 },
  stations: { name: "rt-stations", zIndex: 450 },
  vehicles: { name: "rt-vehicles", zIndex: 600 },
  selected: { name: "rt-selected", zIndex: 650 },
} as const;

/**
 * CartoDB raster basemaps, one per theme. The previous implementation
 * hardcoded `dark_all`, so light mode rendered a dark map.
 */
const TILE_URLS = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
} as const;

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * Leaflet writes vector styles to SVG presentation attributes, which do not
 * accept `var(--token)`. So rather than duplicating the palette here, resolve
 * the design tokens to concrete values from the document and re-resolve when
 * the theme changes. Fallbacks match `app/globals.css` for the first paint.
 */
function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function useMapTokens(themeKey: string | undefined) {
  return useMemo(
    () => ({
      selected: readToken("--state-selected", "#0039A6"),
      surfaceApp: readToken("--surface-app", "#0a0a0a"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-resolve on theme flip
    [themeKey],
  );
}

export interface RealtimeMapCanvasProps {
  mode: TransitMode;
  routeId: string | null;
  routeColor: string;
  stations: StationWithCoords[];
  subwayTrips: SubwayTrip[];
  subwayDepartures: Departure[];
  subwayGeometry: SubwayGeometryArtifact | null;
  railTrains: RailArrival[];
  busTrips: BusTrip[];
  busDepartures: Departure[];
  busVehicles: TransitVehicle[];
  busRouteShape: [number, number][];
  /** Canonical `tripId` of the selected vehicle. */
  selectedVehicleId?: string;
  selectedStationId?: string;
  isStale: boolean;
  userLocation: { latitude: number; longitude: number; accuracy: number } | null;
  onSelectStation: (stationId: string | null) => void;
  onSelectVehicle: (vehicleId: string | null) => void;
  /** Hands the Leaflet instance up so `MapControls` can drive it. */
  onMapReady: (map: LeafletMap | null) => void;
}

/** Wraps a `MarkerVisual` in the Leaflet icon it was designed for. */
function toDivIcon(visual: MarkerVisual, extraClass = ""): L.DivIcon {
  return L.divIcon({
    className: `rt-marker-icon${extraClass ? ` ${extraClass}` : ""}`,
    html: visual.html,
    iconSize: visual.size,
    iconAnchor: visual.anchor,
    popupAnchor: visual.popupAnchor,
  });
}

/** Publishes the Leaflet instance and the live zoom level to React state. */
function MapBridge({
  onMapReady,
  onZoomChange,
}: {
  onMapReady: (map: LeafletMap | null) => void;
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
    onZoomChange(map.getZoom());

    const handleZoom = () => onZoomChange(map.getZoom());
    map.on("zoomend", handleZoom);

    return () => {
      map.off("zoomend", handleZoom);
      onMapReady(null);
    };
  }, [map, onMapReady, onZoomChange]);

  return null;
}

/**
 * Approximate route geometry.
 *
 * ponytail: subway and commuter-rail polylines are straight segments between
 * consecutive station coordinates, not real track alignment. Ceiling: no
 * curvature, and a branching line renders as one zig-zag through its ordered
 * station list. Upgrade path is GTFS `shapes.txt` (deferred to the geometry
 * phase). Buses already use precomputed GTFS shapes and are geographically
 * accurate.
 */
function useRouteGeometry(
  mode: TransitMode,
  stations: StationWithCoords[],
  busRouteShape: [number, number][],
  subwayTrips: SubwayTrip[],
  subwayGeometry: SubwayGeometryArtifact | null,
  selectedVehicleId?: string,
): [number, number][][] {
  return useMemo(() => {
    if (mode === "bus" && busRouteShape.length > 0) return [busRouteShape];
    if (mode === "subway" && subwayGeometry) {
      const resolved = getRenderableSubwayGeometries(
        subwayTrips,
        subwayGeometry,
        selectedVehicleId,
      );
      if (resolved.length > 0) {
        return resolved.map((geometry) => geometry.shape.coordinates);
      }
    }
    return [
      stations
        .filter((s) => s.lat && s.lon)
        .map((s) => [s.lat, s.lon] as [number, number]),
    ];
  }, [
    mode,
    stations,
    busRouteShape,
    subwayTrips,
    subwayGeometry,
    selectedVehicleId,
  ]);
}

export default function RealtimeMapCanvas({
  mode,
  routeId,
  routeColor,
  stations,
  subwayTrips,
  subwayDepartures,
  subwayGeometry,
  railTrains,
  busTrips,
  busDepartures,
  busVehicles,
  busRouteShape,
  selectedVehicleId,
  selectedStationId,
  isStale,
  userLocation,
  onSelectStation,
  onSelectVehicle,
  onMapReady,
}: RealtimeMapCanvasProps) {
  const { resolvedTheme } = useTheme();
  const [zoom, setZoom] = useState(NYC_ZOOM);
  const tokens = useMapTokens(resolvedTheme);

  const tileUrl = resolvedTheme === "light" ? TILE_URLS.light : TILE_URLS.dark;

  const routeGeometries = useRouteGeometry(
    mode,
    stations,
    busRouteShape,
    subwayTrips,
    subwayGeometry,
    selectedVehicleId,
  );

  const stationDistances = useMemo(
    () => calculateStationDistances(stations),
    [stations],
  );

  /**
   * Bearing along the station list (station i → i+1).
   *
   * Subway station lists in this repo run north→south (e.g. D: Norwood → Bay
   * 50 St, 1: 242 St → South Ferry), so this forward bearing is the
   * southbound travel direction. Northbound trains take the reverse.
   */
  const bearingForStation = useMemo(() => {
    const byId = new Map<string, number>();
    for (let i = 0; i < stations.length - 1; i += 1) {
      const from = stations[i];
      const to = stations[i + 1];
      byId.set(
        from.id,
        getBearingDegrees(from.lat, from.lon, to.lat, to.lon),
      );
    }
    // Last station has no "next"; reuse the final segment so a train arriving
    // at the southern terminal still gets a chevron.
    if (stations.length >= 2) {
      const last = stations[stations.length - 1];
      if (!byId.has(last.id)) {
        byId.set(last.id, byId.get(stations[stations.length - 2].id)!);
      }
    }
    return byId;
  }, [stations]);

  const trainPositions = useMemo(() => {
    if (mode !== "subway") return [];

    const departuresByTrip = new Map<string, Departure>();
    for (const departure of subwayDepartures) {
      if (!departuresByTrip.has(departure.tripId)) {
        departuresByTrip.set(departure.tripId, departure);
      }
    }

    return subwayTrips
      .filter((trip) => trip.route.id === routeId)
      .map((trip) => {
        const geometry = subwayGeometry
          ? resolveGeometryForTrip(trip, subwayGeometry)
          : null;
        const projection = geometry
          ? projectTripOnSubwayGeometry(trip, geometry) ??
            projectSubwayTripPosition(trip, stations)
          : projectSubwayTripPosition(trip, stations);
        return projection
          ? {
              trip,
              departure: departuresByTrip.get(trip.id) ?? null,
              projection,
              position: projection.coordinates,
            }
          : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [
    mode,
    subwayTrips,
    subwayDepartures,
    routeId,
    stations,
    subwayGeometry,
  ]);

  const railPositions = useMemo(() => {
    if (mode !== "lirr" && mode !== "metro-north") return [];

    const raw = railTrains
      .filter((t) => t.routeId === routeId)
      .map((train) => {
        const position = interpolateTrainPosition(
          train.stopId,
          train.minutesAway,
          train.direction,
          stations,
          stationDistances,
          mode,
        );
        return position ? { train, position } : null;
      })
      .filter((entry): entry is { train: RailArrival; position: [number, number] } =>
        entry !== null,
      );

    return staggerTrainPositions(raw, 0.5);
  }, [mode, railTrains, routeId, stations, stationDistances]);

  const busPositions = useMemo(() => {
    if (mode !== "bus") return [];
    const tripsById = new Map(busTrips.map((trip) => [trip.id, trip]));
    const departuresByTrip = new Map(busDepartures.map((departure) => [departure.tripId, departure]));
    return busVehicles.flatMap((vehicle) => {
      if (vehicle.position.source !== "actual" || !vehicle.tripId) return [];
      const trip = tripsById.get(vehicle.tripId);
      if (!trip) return [];
      return [{
        vehicle,
        trip,
        departure: departuresByTrip.get(trip.id) ?? null,
        position: [
          vehicle.position.coordinates.latitude,
          vehicle.position.coordinates.longitude,
        ] as [number, number],
      }];
    });
  }, [mode, busDepartures, busTrips, busVehicles]);

  const labelsPermanent = zoom >= STATION_LABEL_ZOOM;

  return (
    <MapContainer
      center={NYC_CENTER}
      zoom={NYC_ZOOM}
      // MapControls supplies accessible, touch-sized replacements.
      zoomControl={false}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <MapBridge onMapReady={onMapReady} onZoomChange={setZoom} />

      <TileLayer
        // Keyed so switching theme swaps tiles instead of reusing the layer.
        key={tileUrl}
        attribution={TILE_ATTRIBUTION}
        url={tileUrl}
      />

      <Pane name={PANES.route.name} style={{ zIndex: PANES.route.zIndex }} />
      <Pane name={PANES.stations.name} style={{ zIndex: PANES.stations.zIndex }} />
      <Pane name={PANES.vehicles.name} style={{ zIndex: PANES.vehicles.zIndex }} />
      <Pane name={PANES.selected.name} style={{ zIndex: PANES.selected.zIndex }} />

      {routeGeometries.map((routeCoords, index) =>
        routeCoords.length > 1 ? (
        <Fragment key={`route-geometry-${index}`}>
          {/* Casing beneath the route gives the line separation from the
              basemap in both themes without hardcoding an opacity. */}
          <Polyline
            pane={PANES.route.name}
            positions={routeCoords}
            interactive={false}
            pathOptions={{
              color: "#000000",
              weight: 9,
              opacity: 0.22,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          <Polyline
            pane={PANES.route.name}
            positions={routeCoords}
            interactive={false}
            pathOptions={{
              color: routeColor,
              weight: 5,
              opacity: isStale ? 0.5 : 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </Fragment>
        ) : null,
      )}

      {stations
        .filter((s) => s.lat && s.lon)
        .map((station) => {
          const isSelected = station.id === selectedStationId;
          const isMajor = station.type === "terminal" || station.type === "hub";
          const radius = isSelected ? 9 : isMajor ? 6.5 : 4.5;

          return (
            <CircleMarker
              key={station.id}
              pane={isSelected ? PANES.selected.name : PANES.stations.name}
              center={[station.lat, station.lon]}
              radius={radius}
              pathOptions={{
                color: isSelected ? tokens.selected : routeColor,
                fillColor: isSelected ? routeColor : tokens.surfaceApp,
                fillOpacity: 1,
                weight: isSelected ? 4 : isMajor ? 3 : 2.5,
              }}
              eventHandlers={{
                click: () => onSelectStation(station.id),
              }}
            >
              {/* Labels are zoom-gated: showing every name on a full line at
                  low zoom is unreadable. The selected station keeps its label
                  at any zoom. Keyed because Leaflet rebuilds a tooltip when
                  its permanence changes. */}
              <Tooltip
                key={labelsPermanent || isSelected ? "permanent" : "hover"}
                permanent={labelsPermanent || isSelected}
                direction="right"
                offset={[8, 0]}
                className={`rt-station-label${
                  isSelected ? " rt-station-label--selected" : ""
                }`}
              >
                {station.name}
              </Tooltip>
            </CircleMarker>
          );
        })}

      {trainPositions.map(({ trip, departure, projection, position }) => {
        const isSelected = trip.id === selectedVehicleId;
        const status = getMarkerStatus({
          minutesAway: departure?.minutesAway ?? null,
          delaySeconds: departure?.delaySeconds,
          isStale,
        });
        const baseStopId = projection.nextStopId.replace(/[NSEW]$/, "");
        const alongList = bearingForStation.get(baseStopId) ?? null;
        const previousStation = stations.find(
          (station) =>
            station.id === projection.previousStopId.replace(/[NSEW]$/, ""),
        );
        const nextStation = stations.find(
          (station) => station.id === baseStopId,
        );
        const bearing =
          previousStation &&
          nextStation &&
          previousStation.id !== nextStation.id
            ? getBearingDegrees(
                previousStation.lat,
                previousStation.lon,
                nextStation.lat,
                nextStation.lon,
              )
            : alongList === null
              ? null
              : trip.direction === "southbound"
                ? alongList
                : alongList + 180;

        return (
          <Marker
            key={`train-${trip.id}`}
            pane={isSelected ? PANES.selected.name : PANES.vehicles.name}
            position={position}
            riseOnHover
            zIndexOffset={isSelected ? 1000 : 0}
            icon={toDivIcon(
              buildSubwayMarkerHtml({
                routeId: trip.route.id,
                directionLabel: getDirectionLabel(trip.direction),
                bearingDegrees: bearing,
                status,
                isSelected,
                accessibleSuffix: `${trip.destination ? `to ${trip.destination}; ` : ""}estimated position`,
              }),
            )}
            eventHandlers={{
              click: () => onSelectVehicle(trip.id),
              keypress: () => onSelectVehicle(trip.id),
            }}
          />
        );
      })}

      {railPositions.map(({ train, position }) => {
        const isSelected = train.tripId === selectedVehicleId;
        const status = getMarkerStatus({
          minutesAway: train.minutesAway,
          delaySeconds: train.delay,
          isStale,
        });
        const forward = bearingForStation.get(train.stopId) ?? null;
        const bearing =
          forward === null
            ? null
            : train.direction === "outbound"
              ? forward
              : forward + 180;

        return (
          <Marker
            key={`rail-${train.tripId}`}
            pane={isSelected ? PANES.selected.name : PANES.vehicles.name}
            position={position}
            riseOnHover
            zIndexOffset={isSelected ? 1000 : 0}
            icon={toDivIcon(
              buildRailMarkerHtml({
                trainId: train.trainId,
                routeColor,
                directionLabel:
                  train.direction === "inbound" ? "Inbound" : "Outbound",
                bearingDegrees: bearing,
                status,
                isSelected,
                accessibleSuffix: train.branchName,
              }),
            )}
            eventHandlers={{
              click: () => onSelectVehicle(train.tripId),
              keypress: () => onSelectVehicle(train.tripId),
            }}
          />
        );
      })}

      {busPositions.map(({ vehicle, trip, departure, position }) => {
        const isSelected = trip.id === selectedVehicleId;
        const status = getMarkerStatus({
          minutesAway: departure?.minutesAway ?? null,
          isStale,
        });

        return (
          <Marker
            key={`bus-${vehicle.id}`}
            pane={isSelected ? PANES.selected.name : PANES.vehicles.name}
            position={position}
            riseOnHover
            zIndexOffset={isSelected ? 1000 : 0}
            icon={toDivIcon(
              buildBusMarkerHtml({
                routeId: trip.route.id,
                routeColor,
                bearingDegrees: vehicle.position.source === "actual"
                  ? vehicle.position.bearing
                  : null,
                status,
                isSelected,
                accessibleSuffix: trip.destination ? `to ${trip.destination}; live GPS position` : "live GPS position",
              }),
            )}
            eventHandlers={{
              click: () => onSelectVehicle(trip.id),
              keypress: () => onSelectVehicle(trip.id),
            }}
          />
        );
      })}

      {userLocation && (
        <>
          {/* `Circle` takes a radius in metres, which is exactly the unit the
              Geolocation API reports accuracy in. */}
          <Circle
            pane={PANES.stations.name}
            center={[userLocation.latitude, userLocation.longitude]}
            radius={userLocation.accuracy}
            interactive={false}
            pathOptions={{
              color: tokens.selected,
              fillColor: tokens.selected,
              fillOpacity: 0.12,
              weight: 1,
            }}
          />
          <Marker
            pane={PANES.selected.name}
            position={[userLocation.latitude, userLocation.longitude]}
            interactive={false}
            icon={toDivIcon(buildUserLocationHtml())}
          />
        </>
      )}
    </MapContainer>
  );
}
