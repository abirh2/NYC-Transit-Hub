"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useRef } from "react";
import L, { type Map as LeafletMap } from "leaflet";
import { useTheme } from "next-themes";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Pane,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import {
  buildBusMarkerHtml,
  buildSubwayMarkerHtml,
  buildUserLocationHtml,
  getMarkerStatus,
  type MarkerVisual,
} from "@/components/realtime/map/markerIcons";
import { getRiderDirectionLabel, type NearbyService } from "@/lib/transit/nearby";
import type { GeolocationPosition } from "@/lib/hooks/useGeolocation";
import type { NearbyBusStopGroup, TransitStation, TransitVehicle } from "@/types/transit";

const TILE_URLS = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
} as const;
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const PANES = {
  route: { name: "nearby-route", zIndex: 400 },
  locations: { name: "nearby-locations", zIndex: 450 },
  vehicles: { name: "nearby-vehicles", zIndex: 600 },
  selected: { name: "nearby-selected", zIndex: 650 },
} as const;

function toDivIcon(visual: MarkerVisual): L.DivIcon {
  return L.divIcon({
    className: "rt-marker-icon",
    html: visual.html,
    iconSize: visual.size,
    iconAnchor: visual.anchor,
    popupAnchor: visual.popupAnchor,
  });
}

function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function MapBridge({
  points,
  selectedPoint,
  onMapReady,
}: {
  points: [number, number][];
  selectedPoint: [number, number] | null;
  onMapReady: (map: LeafletMap | null) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
    return () => onMapReady(null);
  }, [map, onMapReady]);

  useEffect(() => {
    if (selectedPoint) {
      map.setView(selectedPoint, Math.max(map.getZoom(), 15), { animate: true });
      return;
    }
    if (points.length > 1) {
      map.fitBounds(points, { padding: [36, 36], animate: false, maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 15, { animate: false });
    }
  }, [map, points, selectedPoint]);

  return null;
}

function AccessibleLocationMarker({
  center,
  radius,
  pane,
  pathOptions,
  label,
  onSelect,
  children,
}: {
  center: [number, number];
  radius: number;
  pane: string;
  pathOptions: L.PathOptions;
  label: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    const element = markerRef.current?.getElement();
    if (!element) return;

    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", label);
    const handleKeyDown: EventListener = (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") return;
      event.preventDefault();
      onSelect();
    };
    element.addEventListener("keydown", handleKeyDown);
    return () => element.removeEventListener("keydown", handleKeyDown);
  }, [label, onSelect]);

  return (
    <CircleMarker
      ref={markerRef}
      pane={pane}
      center={center}
      radius={radius}
      pathOptions={pathOptions}
      eventHandlers={{ click: onSelect }}
    >
      {children}
    </CircleMarker>
  );
}

function NearbyMapCanvas({
  position,
  stations,
  busGroups,
  selectedService,
  selectedTrainPosition,
  selectedBusVehicle,
  routeGeometry,
  routeColor,
  onSelectLocation,
  onMapReady,
}: {
  position: GeolocationPosition;
  stations: Array<TransitStation & { distance: number }>;
  busGroups: NearbyBusStopGroup[];
  selectedService: NearbyService | null;
  selectedTrainPosition: [number, number] | null;
  selectedBusVehicle: TransitVehicle | null;
  routeGeometry: [number, number][];
  routeColor: string;
  onSelectLocation: (locationId: string) => void;
  onMapReady: (map: LeafletMap | null) => void;
}) {
  const { resolvedTheme } = useTheme();
  const tileUrl = resolvedTheme === "light" ? TILE_URLS.light : TILE_URLS.dark;
  const tokens = useMemo(() => ({
    selected: readToken("--state-selected", "#0039A6"),
    surface: readToken("--surface-app", "#0a0a0a"),
    subway: readToken("--mta-blue", "#0039A6"),
    bus: readToken("--mta-orange", "#FF6319"),
  // Re-read CSS tokens when the active theme changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [resolvedTheme]);

  const allPoints = useMemo<[number, number][]>(() => [
    [position.latitude, position.longitude],
    ...stations.flatMap((station) => station.location
      ? [[station.location.latitude, station.location.longitude] as [number, number]]
      : []),
    ...busGroups.map((group) => [group.location.latitude, group.location.longitude] as [number, number]),
  ], [busGroups, position.latitude, position.longitude, stations]);

  const selectedPoint = useMemo<[number, number] | null>(() => {
    if (!selectedService) return null;
    if (selectedTrainPosition) return selectedTrainPosition;
    if (selectedBusVehicle?.position.source === "actual") {
      return [
        selectedBusVehicle.position.coordinates.latitude,
        selectedBusVehicle.position.coordinates.longitude,
      ];
    }
    if (selectedService.mode === "subway") {
      const station = stations.find((candidate) => `subway:${candidate.id}` === selectedService.locationId);
      return station?.location
        ? [station.location.latitude, station.location.longitude]
        : null;
    }
    const group = busGroups.find((candidate) => candidate.id === selectedService.locationId);
    return group ? [group.location.latitude, group.location.longitude] : null;
  }, [busGroups, selectedBusVehicle, selectedService, selectedTrainPosition, stations]);

  return (
    <MapContainer
      center={[position.latitude, position.longitude]}
      zoom={15}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      style={{ height: "100%", width: "100%" }}
    >
      <MapBridge points={allPoints} selectedPoint={selectedPoint} onMapReady={onMapReady} />
      <TileLayer key={tileUrl} attribution={TILE_ATTRIBUTION} url={tileUrl} />
      <Pane name={PANES.route.name} style={{ zIndex: PANES.route.zIndex }} />
      <Pane name={PANES.locations.name} style={{ zIndex: PANES.locations.zIndex }} />
      <Pane name={PANES.vehicles.name} style={{ zIndex: PANES.vehicles.zIndex }} />
      <Pane name={PANES.selected.name} style={{ zIndex: PANES.selected.zIndex }} />

      {routeGeometry.length > 1 && (
        <Fragment>
          <Polyline
            pane={PANES.route.name}
            positions={routeGeometry}
            interactive={false}
            pathOptions={{ color: "#000000", weight: 9, opacity: 0.22, lineCap: "round", lineJoin: "round" }}
          />
          <Polyline
            pane={PANES.route.name}
            positions={routeGeometry}
            interactive={false}
            pathOptions={{ color: routeColor, weight: 5, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
          />
        </Fragment>
      )}

      {stations.flatMap((station) => {
        if (!station.location) return [];
        const locationId = `subway:${station.id}`;
        const selected = selectedService?.locationId === locationId;
        return [(
          <AccessibleLocationMarker
            key={locationId}
            pane={selected ? PANES.selected.name : PANES.locations.name}
            center={[station.location.latitude, station.location.longitude]}
            radius={selected ? 9 : 6}
            pathOptions={{
              color: selected ? tokens.selected : tokens.subway,
              fillColor: selected ? tokens.subway : tokens.surface,
              fillOpacity: 1,
              weight: selected ? 4 : 3,
            }}
            label={`Select ${station.name} subway station`}
            onSelect={() => onSelectLocation(locationId)}
          >
            <Tooltip permanent={selected} direction="right" offset={[8, 0]} className={selected ? "rt-station-label rt-station-label--selected" : "rt-station-label"}>
              {station.name}
            </Tooltip>
          </AccessibleLocationMarker>
        )];
      })}

      {busGroups.map((group) => {
        const selected = selectedService?.locationId === group.id;
        return (
          <AccessibleLocationMarker
            key={group.id}
            pane={selected ? PANES.selected.name : PANES.locations.name}
            center={[group.location.latitude, group.location.longitude]}
            radius={selected ? 8 : 5}
            pathOptions={{
              color: selected ? tokens.selected : tokens.bus,
              fillColor: selected ? tokens.bus : tokens.surface,
              fillOpacity: 1,
              weight: selected ? 4 : 2.5,
            }}
            label={`Select ${group.name} bus stop`}
            onSelect={() => onSelectLocation(group.id)}
          >
            <Tooltip permanent={selected} direction="right" offset={[8, 0]} className={selected ? "rt-station-label rt-station-label--selected" : "rt-station-label"}>
              {group.name}
            </Tooltip>
          </AccessibleLocationMarker>
        );
      })}

      <Marker
        pane={PANES.selected.name}
        position={[position.latitude, position.longitude]}
        icon={toDivIcon(buildUserLocationHtml())}
        interactive={false}
        zIndexOffset={1000}
      />

      {selectedService?.mode === "subway" && selectedTrainPosition && (
        <Marker
          pane={PANES.vehicles.name}
          position={selectedTrainPosition}
          zIndexOffset={800}
          icon={toDivIcon(buildSubwayMarkerHtml({
            routeId: selectedService.departure.routeId,
            directionLabel: getRiderDirectionLabel(selectedService.departure.direction),
            bearingDegrees: null,
            status: getMarkerStatus({
              minutesAway: selectedService.departure.minutesAway,
              delaySeconds: selectedService.departure.delaySeconds,
              isStale: selectedService.sourceState === "stale",
            }),
            isSelected: true,
            accessibleSuffix: selectedService.departure.destination ?? undefined,
          }))}
        />
      )}

      {selectedService?.mode === "bus" && selectedBusVehicle?.position.source === "actual" && (
        <Marker
          pane={PANES.vehicles.name}
          position={[
            selectedBusVehicle.position.coordinates.latitude,
            selectedBusVehicle.position.coordinates.longitude,
          ]}
          zIndexOffset={800}
          icon={toDivIcon(buildBusMarkerHtml({
            routeId: selectedService.departure.routeId,
            routeColor,
            bearingDegrees: selectedBusVehicle.position.bearing,
            status: getMarkerStatus({
              minutesAway: selectedService.departure.minutesAway,
              delaySeconds: selectedService.departure.delaySeconds,
              isStale: selectedService.sourceState === "stale",
            }),
            isSelected: true,
            accessibleSuffix: selectedService.departure.destination ?? undefined,
          }))}
        />
      )}
    </MapContainer>
  );
}

export default NearbyMapCanvas;
