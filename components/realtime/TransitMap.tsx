"use client";

/**
 * TransitMap Component
 * 
 * Leaflet-based map showing transit stations and live vehicle positions.
 * Supports subway, bus, LIRR, and Metro-North.
 */

import { useMemo, useEffect, useState } from "react";
import { Card, CardBody, Spinner } from "@heroui/react";
import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import type { TransitMode, TrainArrival, BusArrival, RailArrival } from "@/types/mta";
import { getRailStationName } from "@/lib/gtfs/rail-stations";
import {
  calculateStationDistances,
  interpolateTrainPosition,
  staggerTrainPositions,
  type StationWithCoords,
} from "@/lib/utils/train-positioning";

// Leaflet is loaded dynamically on client side

// Dynamically import Leaflet components (they don't work with SSR)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

// NYC center coordinates
const NYC_CENTER: [number, number] = [40.7128, -74.006];
const DEFAULT_ZOOM = 11;

// Subway line colors
const SUBWAY_COLORS: Record<string, string> = {
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "6": "#00933C",
  "7": "#B933AD",
  "A": "#0039A6", "C": "#0039A6", "E": "#0039A6",
  "B": "#FF6319", "D": "#FF6319", "F": "#FF6319", "M": "#FF6319",
  "G": "#6CBE45",
  "J": "#996633", "Z": "#996633",
  "L": "#A7A9AC",
  "N": "#FCCC0A", "Q": "#FCCC0A", "R": "#FCCC0A", "W": "#FCCC0A",
  "S": "#808183", "SF": "#808183", "SR": "#808183",
  "SIR": "#0039A6",
};

interface TransitMapProps {
  mode: TransitMode;
  selectedLine: string | null;
  stations: StationWithCoords[];
  lineColor: string;
  trains?: TrainArrival[];
  railTrains?: RailArrival[];
  buses?: BusArrival[];
  busRouteShape?: [number, number][]; // For bus routes: the route path
  isLoading?: boolean;
}

/**
 * Create a custom subway marker icon
 */
function createSubwayIcon(line: string, direction: "N" | "S", isArriving: boolean, L: typeof import("leaflet")): import("leaflet").DivIcon {
  const bgColor = SUBWAY_COLORS[line] || "#808183";
  const textColor = ["N", "Q", "R", "W"].includes(line) ? "#000" : "#fff";
  const arrow = direction === "N" ? "↑" : "↓";
  const arrowColor = direction === "N" ? "#22c55e" : "#ef4444";
  const ringColor = isArriving ? "#22c55e" : "transparent";
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        gap: 2px;
        background: #1a1a2e;
        padding: 3px 6px 3px 4px;
        border-radius: 16px;
        border: 2px solid ${ringColor};
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      ">
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${bgColor};
          color: ${textColor};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          font-family: Helvetica, Arial, sans-serif;
        ">${line}</div>
        <div style="
          color: ${arrowColor};
          font-size: 14px;
          font-weight: bold;
        ">${arrow}</div>
      </div>
    `,
    iconSize: [50, 30],
    iconAnchor: [25, 15],
    popupAnchor: [0, -15],
  });
}

/**
 * Create a custom rail marker icon
 */
function createRailIcon(trainId: string | null, direction: "inbound" | "outbound", isArriving: boolean, color: string, L: typeof import("leaflet")): import("leaflet").DivIcon {
  // For LIRR/Metro-North: outbound = away from NYC (north/east) = up arrow
  // inbound = toward NYC (south/west) = down arrow
  const arrow = direction === "outbound" ? "↑" : "↓";
  const arrowColor = direction === "outbound" ? "#22c55e" : "#ef4444";
  const ringColor = isArriving ? "#22c55e" : "transparent";
  // trainId should always have a value now, but fallback just in case
  const label = trainId && trainId !== "---" ? trainId : "#";
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        gap: 4px;
        background: #1a1a2e;
        padding: 4px 8px;
        border-radius: 16px;
        border: 2px solid ${ringColor};
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      ">
        <div style="
          width: 20px;
          height: 20px;
          background: ${color};
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M4 11V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4"></path>
            <path d="M4 15v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
            <path d="M4 11h16v4H4z"></path>
            <circle cx="7" cy="18" r="1"></circle>
            <circle cx="17" cy="18" r="1"></circle>
          </svg>
        </div>
        <span style="color: #fff; font-size: 12px; font-weight: 600;">${label}</span>
        <div style="
          color: ${arrowColor};
          font-size: 14px;
          font-weight: bold;
        ">${arrow}</div>
      </div>
    `,
    iconSize: [80, 30],
    iconAnchor: [40, 15],
    popupAnchor: [0, -15],
  });
}

/**
 * Create a custom bus marker icon
 */
function createBusIcon(routeId: string, bearing: number | null, L: typeof import("leaflet")): import("leaflet").DivIcon {
  // Calculate rotation based on bearing
  const rotation = bearing ? bearing : 0;
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        gap: 4px;
        background: #1a1a2e;
        padding: 4px 8px;
        border-radius: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      ">
        <div style="
          width: 22px;
          height: 22px;
          background: #3b82f6;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${rotation}deg);
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M19 17h2l.64-2.54c.24-.959.24-1.962 0-2.92l-.64-2.54H3l-.64 2.54c-.24.959-.24 1.962 0 2.92L3 17h2"></path>
            <path d="M14 17H9"></path>
            <circle cx="6.5" cy="17.5" r="2.5"></circle>
            <circle cx="16.5" cy="17.5" r="2.5"></circle>
          </svg>
        </div>
        <span style="color: #fff; font-size: 12px; font-weight: 600;">${routeId}</span>
        ${bearing !== null ? `
          <div style="
            color: #3b82f6;
            font-size: 12px;
            transform: rotate(${rotation}deg);
          ">➤</div>
        ` : ''}
      </div>
    `,
    iconSize: [80, 30],
    iconAnchor: [40, 15],
    popupAnchor: [0, -15],
  });
}

/**
 * Get station name from ID
 */
function getStationName(stopId: string, stations: StationWithCoords[]): string {
  const baseId = stopId.replace(/[NS]$/, "");
  const station = stations.find(s => s.id === baseId);
  return station?.name || `Stop ${stopId}`;
}

/**
 * Format minutes for display
 */
function formatMinutes(mins: number): string {
  if (mins <= 0) return "Arriving now";
  if (mins === 1) return "1 min";
  return `${mins} min`;
}

export function TransitMap({
  mode,
  selectedLine,
  stations,
  lineColor,
  trains = [],
  railTrains = [],
  buses = [],
  busRouteShape = [],
  isLoading = false,
}: TransitMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import Leaflet on client side only
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  // For buses, use the route shape; for subway/rail, connect stations
  const lineCoords = useMemo(() => {
    // Buses use pre-computed route shapes from GTFS
    if (mode === "bus" && busRouteShape.length > 0) {
      return busRouteShape;
    }
    // Subway/rail: connect stations in order
    return stations
      .filter((s) => s.lat && s.lon)
      .map((s) => [s.lat, s.lon] as [number, number]);
  }, [stations, mode, busRouteShape]);

  const mapCenter = useMemo(() => {
    // For subway/rail, center on stations
    if (lineCoords.length > 0) {
      const lats = lineCoords.map((c) => c[0]);
      const lons = lineCoords.map((c) => c[1]);
      return [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lons) + Math.max(...lons)) / 2,
      ] as [number, number];
    }
    
    // For buses (no static stations), center on bus positions
    if (mode === "bus" && buses.length > 0) {
      const busesWithPos = buses.filter(b => b.latitude && b.longitude);
      if (busesWithPos.length > 0) {
        const lats = busesWithPos.map(b => b.latitude!);
        const lons = busesWithPos.map(b => b.longitude!);
        return [
          (Math.min(...lats) + Math.max(...lats)) / 2,
          (Math.min(...lons) + Math.max(...lons)) / 2,
        ] as [number, number];
      }
    }
    
    return NYC_CENTER;
  }, [lineCoords, mode, buses]);

  // Pre-calculate station distances for efficient position interpolation
  const stationDistances = useMemo(() => {
    return calculateStationDistances(stations);
  }, [stations]);

  const trainPositions = useMemo(() => {
    if (mode !== "subway") return [];
    
    const rawPositions = trains
      .filter((t) => t.routeId === selectedLine)
      .map((train) => {
        const baseStopId = train.stopId.replace(/[NS]$/, "");
        const pos = interpolateTrainPosition(
          baseStopId,
          train.minutesAway,
          train.direction,
          stations,
          stationDistances,
          mode
        );
        return pos ? { train, position: pos } : null;
      })
      .filter(Boolean) as Array<{ train: TrainArrival; position: [number, number] }>;
    
    // Apply staggering to prevent overlapping markers
    return staggerTrainPositions(rawPositions, 0.3); // 300m minimum separation for subway
  }, [trains, stations, stationDistances, selectedLine, mode]);

  const railPositions = useMemo(() => {
    if (mode !== "lirr" && mode !== "metro-north") return [];
    
    const rawPositions = railTrains
      .filter((t) => t.routeId === selectedLine)
      .map((train) => {
        const pos = interpolateTrainPosition(
          train.stopId,
          train.minutesAway,
          train.direction,
          stations,
          stationDistances,
          mode
        );
        return pos ? { train, position: pos } : null;
      })
      .filter(Boolean) as Array<{ train: RailArrival; position: [number, number] }>;
    
    // Apply staggering with larger separation for regional rail
    return staggerTrainPositions(rawPositions, 0.5); // 500m minimum separation for rail
  }, [railTrains, stations, stationDistances, selectedLine, mode]);

  const busPositions = useMemo(() => {
    if (mode !== "bus") return [];
    return buses
      .filter((b) => b.latitude && b.longitude)
      .map((bus) => ({
        bus,
        position: [bus.latitude!, bus.longitude!] as [number, number],
      }));
  }, [buses, mode]);

  if (!selectedLine) {
    return (
      <Card className="h-full">
        <CardBody className="flex flex-col items-center justify-center h-full text-center">
          <MapPin className="h-12 w-12 text-foreground/30 mb-4" />
          <p className="text-foreground/60">
            Select a line to see it on the map
          </p>
        </CardBody>
      </Card>
    );
  }

  if (!isClient || !L) {
    return (
      <Card className="h-full">
        <CardBody className="flex flex-col items-center justify-center h-full">
          <Spinner size="lg" />
          <p className="text-foreground/60 mt-4">Loading map...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardBody className="p-0 h-full">
        <div className="h-full w-full">
          <MapContainer
            center={mapCenter}
            zoom={DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Draw line connecting stations */}
            {lineCoords.length > 1 && (
              <Polyline
                positions={lineCoords}
                pathOptions={{
                  color: lineColor,
                  weight: 4,
                  opacity: 0.8,
                }}
              />
            )}

            {stations
              .filter((s) => s.lat && s.lon)
              .map((station) => (
                <CircleMarker
                  key={station.id}
                  center={[station.lat, station.lon]}
                  radius={station.type === "terminal" || station.type === "hub" ? 8 : 5}
                  pathOptions={{
                    color: lineColor,
                    fillColor: "#1a1a2e",
                    fillOpacity: 1,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <div className="font-semibold text-base">{station.name}</div>
                    {station.type && (
                      <div className="text-xs text-gray-500 capitalize">{station.type}</div>
                    )}
                  </Popup>
                </CircleMarker>
              ))}

            {/* Subway train markers with custom icons */}
            {trainPositions.map(({ train, position }, idx) => (
              <Marker
                key={`train-${train.tripId}-${idx}`}
                position={position}
                icon={createSubwayIcon(
                  train.routeId,
                  train.direction,
                  train.minutesAway <= 1,
                  L
                )}
              >
                <Popup>
                  <div className="min-w-[200px] p-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
                        style={{ 
                          background: SUBWAY_COLORS[train.routeId] || lineColor,
                          color: ["N", "Q", "R", "W"].includes(train.routeId) ? "#000" : "#fff"
                        }}
                      >
                        {train.routeId}
                      </div>
                      <div>
                        <div className="font-semibold">{train.routeId} Train</div>
                        <div className="text-xs text-gray-500">
                          {train.direction === "N" ? "Northbound / Uptown" : "Southbound / Downtown"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Next Stop</span>
                        <span className="font-medium">{getStationName(train.stopId, stations)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Arriving</span>
                        <span 
                          className="font-semibold px-2 py-0.5 rounded text-xs"
                          style={{
                            background: train.minutesAway <= 1 ? "#22c55e" : 
                                       train.minutesAway <= 5 ? "#eab308" : "#6b7280",
                            color: "#fff"
                          }}
                        >
                          {formatMinutes(train.minutesAway)}
                        </span>
                      </div>
                      {train.arrivalTime && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Time</span>
                          <span>{train.arrivalTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Rail train markers with custom icons */}
            {railPositions.map(({ train, position }, idx) => (
              <Marker
                key={`rail-${train.tripId}-${idx}`}
                position={position}
                icon={createRailIcon(
                  train.trainId,
                  train.direction,
                  train.minutesAway <= 1,
                  lineColor,
                  L
                )}
              >
                <Popup>
                  <div className="min-w-[220px] p-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ background: lineColor }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="M4 11V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4"></path>
                          <path d="M4 15v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
                          <path d="M4 11h16v4H4z"></path>
                          <circle cx="7" cy="18" r="1"></circle>
                          <circle cx="17" cy="18" r="1"></circle>
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">
                          {train.trainId ? `Train ${train.trainId}` : train.branchName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {train.direction === "inbound" 
                            ? mode === "lirr" ? "To Penn Station" : "To Grand Central"
                            : mode === "lirr" ? "From Penn Station" : "From Grand Central"
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Next Stop</span>
                        <span className="font-medium">{getRailStationName(train.stopId, mode)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Arriving</span>
                        <span 
                          className="font-semibold px-2 py-0.5 rounded text-xs"
                          style={{
                            background: train.minutesAway <= 1 ? "#22c55e" : 
                                       train.minutesAway <= 5 ? "#eab308" : "#6b7280",
                            color: "#fff"
                          }}
                        >
                          {formatMinutes(train.minutesAway)}
                        </span>
                      </div>
                      {train.arrivalTime && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Time</span>
                          <span>{train.arrivalTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                        </div>
                      )}
                      {train.delay > 60 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Status</span>
                          <span className="text-amber-500 text-xs font-medium">
                            {Math.round(train.delay / 60)} min late
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Bus markers with custom icons */}
            {busPositions.map(({ bus, position }, idx) => (
              <Marker
                key={`bus-${bus.vehicleId}-${idx}`}
                position={position}
                icon={createBusIcon(bus.routeId, bus.bearing, L)}
              >
                <Popup>
                  <div className="min-w-[200px] p-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="M19 17h2l.64-2.54c.24-.959.24-1.962 0-2.92l-.64-2.54H3l-.64 2.54c-.24.959-.24 1.962 0 2.92L3 17h2"></path>
                          <path d="M14 17H9"></path>
                          <circle cx="6.5" cy="17.5" r="2.5"></circle>
                          <circle cx="16.5" cy="17.5" r="2.5"></circle>
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">{bus.routeId}</div>
                        <div className="text-xs text-gray-500">
                          {bus.headsign || "In Service"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {bus.nextStopName && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Next Stop</span>
                          <span className="font-medium text-right max-w-[140px] truncate">{bus.nextStopName}</span>
                        </div>
                      )}
                      {bus.minutesAway !== null && bus.minutesAway !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">ETA</span>
                          <span 
                            className="font-semibold px-2 py-0.5 rounded text-xs"
                            style={{
                              background: bus.minutesAway <= 1 ? "#22c55e" : 
                                         bus.minutesAway <= 5 ? "#eab308" : "#3b82f6",
                              color: "#fff"
                            }}
                          >
                            {formatMinutes(bus.minutesAway)}
                          </span>
                        </div>
                      )}
                      {bus.distanceFromStop && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Distance</span>
                          <span>{(bus.distanceFromStop / 1000).toFixed(1)} km</span>
                        </div>
                      )}
                      {bus.progressStatus && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Status</span>
                          <span className="capitalize text-xs">{bus.progressStatus.toLowerCase().replace(/_/g, " ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
