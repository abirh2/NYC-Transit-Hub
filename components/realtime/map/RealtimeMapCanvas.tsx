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

import { useEffect, useMemo, useState } from "react";
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

import type { BusArrival, RailArrival, TrainArrival, TransitMode } from "@/types/mta";
import {
  calculateStationDistances,
  interpolateTrainPosition,
  staggerTrainPositions,
  type StationWithCoords,
} from "@/lib/utils/train-positioning";
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
  trains: TrainArrival[];
  railTrains: RailArrival[];
  buses: BusArrival[];
  busRouteShape: [number, number][];
  /** `tripId` (subway/rail) or `vehicleId` (bus) of the selected vehicle. */
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
): [number, number][] {
  return useMemo(() => {
    if (mode === "bus" && busRouteShape.length > 0) return busRouteShape;
    return stations
      .filter((s) => s.lat && s.lon)
      .map((s) => [s.lat, s.lon] as [number, number]);
  }, [mode, stations, busRouteShape]);
}

export default function RealtimeMapCanvas({
  mode,
  routeId,
  routeColor,
  stations,
  trains,
  railTrains,
  buses,
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

  const routeCoords = useRouteGeometry(mode, stations, busRouteShape);

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

    const raw = trains
      .filter((t) => t.routeId === routeId)
      .map((train) => {
        const baseStopId = train.stopId.replace(/[NS]$/, "");
        const position = interpolateTrainPosition(
          baseStopId,
          train.minutesAway,
          train.direction,
          stations,
          stationDistances,
          mode,
        );
        return position ? { train, position } : null;
      })
      .filter((entry): entry is { train: TrainArrival; position: [number, number] } =>
        entry !== null,
      );

    return staggerTrainPositions(raw, 0.3);
  }, [mode, trains, routeId, stations, stationDistances]);

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
    return buses
      .filter((b) => b.latitude && b.longitude)
      .map((bus) => ({
        bus,
        position: [bus.latitude as number, bus.longitude as number] as [
          number,
          number,
        ],
      }));
  }, [mode, buses]);

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

      {routeCoords.length > 1 && (
        <>
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
        </>
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

      {trainPositions.map(({ train, position }) => {
        const isSelected = train.tripId === selectedVehicleId;
        const status = getMarkerStatus({
          minutesAway: train.minutesAway,
          delaySeconds: train.delay,
          isStale,
        });
        const baseStopId = train.stopId.replace(/[NS]$/, "");
        const alongList = bearingForStation.get(baseStopId) ?? null;
        // Station lists run north→south, so list-forward is southbound.
        const bearing =
          alongList === null
            ? null
            : train.direction === "S"
              ? alongList
              : alongList + 180;

        return (
          <Marker
            key={`train-${train.tripId}`}
            pane={isSelected ? PANES.selected.name : PANES.vehicles.name}
            position={position}
            riseOnHover
            zIndexOffset={isSelected ? 1000 : 0}
            icon={toDivIcon(
              buildSubwayMarkerHtml({
                routeId: train.routeId,
                directionLabel:
                  train.direction === "N" ? "Northbound" : "Southbound",
                bearingDegrees: bearing,
                status,
                isSelected,
                accessibleSuffix: train.headsign ? `to ${train.headsign}` : undefined,
              }),
            )}
            eventHandlers={{
              click: () => onSelectVehicle(train.tripId),
              keypress: () => onSelectVehicle(train.tripId),
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

      {busPositions.map(({ bus, position }) => {
        const isSelected = bus.vehicleId === selectedVehicleId;
        const status = getMarkerStatus({
          minutesAway: bus.minutesAway,
          isStale,
        });

        return (
          <Marker
            key={`bus-${bus.vehicleId}`}
            pane={isSelected ? PANES.selected.name : PANES.vehicles.name}
            position={position}
            riseOnHover
            zIndexOffset={isSelected ? 1000 : 0}
            icon={toDivIcon(
              buildBusMarkerHtml({
                routeId: bus.routeId,
                routeColor,
                bearingDegrees: bus.bearing,
                status,
                isSelected,
                accessibleSuffix: bus.headsign ? `to ${bus.headsign}` : undefined,
              }),
            )}
            eventHandlers={{
              click: () => onSelectVehicle(bus.vehicleId),
              keypress: () => onSelectVehicle(bus.vehicleId),
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
