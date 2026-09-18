"use client";

import { useMemo } from "react";
import { Card, CardBody, Spinner } from "@heroui/react";
import { ArrowDown, ArrowUp, Train } from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  SubwayBullet,
} from "@/components/ui";
import {
  getLineColor,
  getLineStations,
  type LineId,
} from "@/lib/gtfs/line-stations";
import { projectSubwayTripPosition } from "@/lib/transit/subway-trip-position";
import type { StationWithCoords } from "@/lib/utils/train-positioning";
import type { Departure, SubwayTrip } from "@/types/transit";

interface LineDiagramProps {
  selectedLine: LineId | null;
  trips: SubwayTrip[];
  departures: Departure[];
  selectedTripId?: string;
  onSelectTrip?: (tripId: string | null) => void;
  isLoading?: boolean;
  error?: string | null;
}

const STATION_SPACING = 64;

function DiagramState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      {children}
    </div>
  );
}

function isPrimaryDirection(trip: SubwayTrip): boolean {
  return trip.direction === "northbound" || trip.direction === "westbound";
}

export function LineDiagram({
  selectedLine,
  trips,
  departures,
  selectedTripId,
  onSelectTrip,
  isLoading = false,
  error = null,
}: LineDiagramProps) {
  const stations = useMemo(
    () => (selectedLine ? getLineStations(selectedLine) : []),
    [selectedLine],
  );
  const stationGeometry = useMemo<StationWithCoords[]>(
    () =>
      stations
        .filter(
          (station): station is typeof station & { lat: number; lon: number } =>
            typeof station.lat === "number" && typeof station.lon === "number",
        )
        .map((station) => ({
          id: station.id,
          name: station.name,
          lat: station.lat,
          lon: station.lon,
          type: station.type,
        })),
    [stations],
  );
  const stationIndex = useMemo(
    () => new Map(stations.map((station, index) => [station.id, index])),
    [stations],
  );
  const departuresByTrip = useMemo(() => {
    const result = new Map<string, Departure>();
    for (const departure of departures) {
      if (!result.has(departure.tripId)) result.set(departure.tripId, departure);
    }
    return result;
  }, [departures]);
  const lineColor = selectedLine ? getLineColor(selectedLine) : "#808183";

  const trainPositions = useMemo(() => {
    if (!selectedLine || stations.length === 0) return [];
    const denominator = Math.max(1, stations.length - 1);

    return trips
      .filter((trip) => trip.route.id === selectedLine)
      .map((trip) => {
        const projection = projectSubwayTripPosition(trip, stationGeometry);
        if (!projection) return null;
        const previousIndex = stationIndex.get(
          projection.previousStopId.replace(/[NSEW]$/, ""),
        );
        const nextIndex = stationIndex.get(
          projection.nextStopId.replace(/[NSEW]$/, ""),
        );
        if (previousIndex === undefined || nextIndex === undefined) return null;
        const positionIndex =
          previousIndex + (nextIndex - previousIndex) * projection.progressRatio;

        return {
          trip,
          departure: departuresByTrip.get(trip.id) ?? null,
          topPercent: (positionIndex / denominator) * 100,
          lane: isPrimaryDirection(trip) ? "primary" : "secondary",
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [
    selectedLine,
    stations,
    trips,
    stationGeometry,
    stationIndex,
    departuresByTrip,
  ]);

  if (!selectedLine) {
    return (
      <DiagramState>
        <EmptyState
          icon={<Train className="h-6 w-6" aria-hidden="true" />}
          title="Choose a subway route"
          description="Pick a line above to see each active train along its route."
        />
      </DiagramState>
    );
  }
  if (error) {
    return (
      <DiagramState>
        <ErrorState title="Train data unavailable" description={error} />
      </DiagramState>
    );
  }
  if (isLoading && trips.length === 0) {
    return (
      <DiagramState>
        <LoadingSkeleton
          variant="list"
          count={6}
          className="w-full max-w-md"
        />
      </DiagramState>
    );
  }
  if (trips.length === 0) {
    return (
      <DiagramState>
        <EmptyState
          icon={<Train className="h-6 w-6" aria-hidden="true" />}
          title={`No ${selectedLine} trains reporting`}
          description="No active trips are reporting on this route right now."
        />
      </DiagramState>
    );
  }

  const diagramHeight = Math.max(stations.length * STATION_SPACING, 520);

  return (
    <Card className="h-full overflow-hidden">
      <CardBody className="relative h-full p-0">
        <div className="absolute inset-x-0 top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center border-b border-border-subtle bg-surface-panel px-4 py-2 text-xs font-medium text-foreground/65">
          <span className="flex items-center justify-end gap-1.5 pr-5"><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />North / westbound</span>
          <SubwayBullet line={selectedLine} size="sm" />
          <span className="flex items-center gap-1.5 pl-5"><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />South / eastbound</span>
        </div>

        <div className="absolute inset-0 overflow-y-auto px-3 pb-16 pt-16 sm:px-6">
          <div className="relative mx-auto max-w-3xl" style={{ height: diagramHeight }}>
            <div className="absolute bottom-0 left-[calc(50%-2.5rem)] top-0 w-1 rounded-full opacity-65" style={{ backgroundColor: lineColor }} aria-hidden="true" />
            <div className="absolute bottom-0 left-[calc(50%+2.25rem)] top-0 w-1 rounded-full opacity-65" style={{ backgroundColor: lineColor }} aria-hidden="true" />

            {stations.map((station, index) => {
              const topPercent = stations.length > 1 ? (index / (stations.length - 1)) * 100 : 50;
              const isTerminal = station.type === "terminal" || index === 0 || index === stations.length - 1;
              return (
                <div key={station.id} className="absolute left-1/2 z-10 flex w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center" style={{ top: `${topPercent}%` }}>
                  <span className={`rounded-full bg-surface-panel ${isTerminal ? "h-4 w-4 border-4" : "h-3 w-3 border-[3px]"}`} style={{ borderColor: lineColor }} aria-hidden="true" />
                  <span className="absolute left-full ml-2 w-24 truncate text-xs font-medium leading-tight text-foreground sm:w-40 sm:whitespace-normal sm:text-sm">{station.name}</span>
                </div>
              );
            })}

            {trainPositions.map(({ trip, departure, topPercent, lane }) => {
              const isSelected = trip.id === selectedTripId;
              const isPrimary = lane === "primary";
              const directionLabel = isPrimary ? "north or westbound" : "south or eastbound";
              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => onSelectTrip?.(isSelected ? null : trip.id)}
                  aria-pressed={isSelected}
                  aria-label={`${trip.route.displayName} train ${directionLabel}${trip.destination ? ` to ${trip.destination}` : ""}; estimated route position`}
                  className={`absolute z-20 flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-surface-floating transition-[transform,box-shadow] duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${isSelected ? "border-state-selected shadow-lg ring-2 ring-state-selected" : "border-border-strong shadow-md"}`}
                  style={{ top: `${Math.max(0, Math.min(100, topPercent))}%`, left: isPrimary ? "calc(50% - 2.375rem)" : "calc(50% + 2.625rem)" }}
                >
                  <SubwayBullet line={trip.route.id} size="sm" />
                  <span className="absolute -bottom-3 whitespace-nowrap rounded bg-surface-floating px-1 text-[10px] font-semibold text-foreground">
                    {departure?.minutesAway === null || departure?.minutesAway === undefined ? "Live" : departure.minutesAway <= 0 ? "Now" : `${departure.minutesAway}m`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 border-t border-border-subtle bg-surface-panel px-4 py-2 text-xs text-foreground/65">
          <span>{trainPositions.length} active train{trainPositions.length === 1 ? "" : "s"}</span>
          {isLoading && <span className="flex items-center gap-1.5"><Spinner size="sm" /> Updating…</span>}
        </div>
      </CardBody>
    </Card>
  );
}
