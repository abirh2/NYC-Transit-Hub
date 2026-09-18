import {
  getBusRouteColor,
  getBusRouteTextColor,
} from "@/lib/gtfs/bus-routes";
import { normalizeBusDirection } from "@/lib/transit/direction";
import { REALTIME_STALE_AFTER_MS } from "@/lib/transit/cache-policy";
import type {
  BusTrip,
  Departure,
  RealtimeSnapshot,
  StopTimePrediction,
  TransitRoute,
  TransitVehicle,
} from "@/types/transit";

interface SiriCallInput {
  StopPointRef?: string;
  StopPointName?: string;
  ExpectedArrivalTime?: string;
  AimedArrivalTime?: string;
  ExpectedDepartureTime?: string;
  AimedDepartureTime?: string;
  DistanceFromStop?: number;
  VehicleAtStop?: boolean;
  ArrivalProximityText?: string;
  NumberOfStopsAway?: number;
  Extensions?: {
    Distances?: {
      DistanceFromCall?: number;
      PresentableDistance?: string;
      StopsFromCall?: number;
    };
  };
}

export interface SiriVehicleActivityInput {
  RecordedAtTime: string;
  MonitoredVehicleJourney: {
    LineRef: string;
    DirectionRef: string;
    FramedVehicleJourneyRef?: {
      DataFrameRef: string;
      DatedVehicleJourneyRef: string;
    };
    JourneyPatternRef?: string;
    DestinationName?: string;
    VehicleRef?: string;
    VehicleLocation?: { Longitude: number; Latitude: number };
    Bearing?: number;
    ProgressStatus?: string;
    MonitoredCall?: SiriCallInput;
    OnwardCalls?: { OnwardCall?: SiriCallInput[] };
  };
}

function stripMtaPrefix(value: string | undefined): string | null {
  if (!value) return null;
  return value.split("_").pop() ?? value;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createBusRoute(routeId: string): TransitRoute {
  return {
    id: routeId,
    displayName: routeId,
    longName: null,
    mode: "bus",
    color: getBusRouteColor(routeId),
    textColor: getBusRouteTextColor(routeId),
    agencyId: "MTA NYCT",
  };
}

function createStopPrediction(
  call: SiriCallInput,
  sequence: number,
): StopTimePrediction | null {
  const stopId = stripMtaPrefix(call.StopPointRef);
  if (!stopId) return null;

  return {
    stopId,
    stationId: null,
    sequence,
    arrivalTime: parseDate(call.ExpectedArrivalTime ?? call.AimedArrivalTime),
    departureTime: parseDate(
      call.ExpectedDepartureTime ?? call.AimedDepartureTime,
    ),
    delaySeconds: 0,
    scheduleRelationship: "scheduled",
  };
}

export function normalizeSiriActivities(
  activities: readonly SiriVehicleActivityInput[],
  options: { now?: Date; monitoredStopId?: string } = {},
): RealtimeSnapshot {
  const now = options.now ?? new Date();
  const trips: BusTrip[] = [];
  const departures: Departure[] = [];
  const vehicles: TransitVehicle[] = [];

  for (const activity of activities) {
    const journey = activity.MonitoredVehicleJourney;
    const routeId = stripMtaPrefix(journey.LineRef) ?? journey.LineRef;
    const tripId =
      journey.FramedVehicleJourneyRef?.DatedVehicleJourneyRef ??
      journey.VehicleRef ??
      `${routeId}:${activity.RecordedAtTime}`;
    const recordedAt = parseDate(activity.RecordedAtTime);
    const monitoredCall = journey.MonitoredCall;
    const onwardCalls = journey.OnwardCalls?.OnwardCall ?? [];
    const stopTimeUpdates = [
      ...(monitoredCall ? [monitoredCall] : []),
      ...onwardCalls,
    ]
      .map(createStopPrediction)
      .filter((prediction): prediction is StopTimePrediction => prediction !== null);
    const boardingStopId = options.monitoredStopId ?? null;
    const monitoredCallStopId = stripMtaPrefix(monitoredCall?.StopPointRef);
    const direction = normalizeBusDirection(journey.DirectionRef);
    const isAtStop = monitoredCall?.VehicleAtStop === true;
    const nextCall = options.monitoredStopId
      ? onwardCalls[0] ?? monitoredCall
      : monitoredCall ?? onwardCalls[0];
    const nextStopId = stripMtaPrefix(nextCall?.StopPointRef);
    const departureCall = options.monitoredStopId ? monitoredCall : nextCall;
    const departureStopId = stripMtaPrefix(departureCall?.StopPointRef);
    const departureArrival = parseDate(
      departureCall?.ExpectedArrivalTime ?? departureCall?.AimedArrivalTime,
    );
    const departureTime = parseDate(
      departureCall?.ExpectedDepartureTime ?? departureCall?.AimedDepartureTime,
    );
    const distanceData = monitoredCall?.Extensions?.Distances;
    const stopsAway = monitoredCall?.NumberOfStopsAway ?? distanceData?.StopsFromCall ?? null;
    const progressText = distanceData?.PresentableDistance ??
      monitoredCall?.ArrivalProximityText ??
      journey.ProgressStatus ??
      null;

    const trip: BusTrip = {
      id: tripId,
      mode: "bus",
      route: createBusRoute(routeId),
      direction,
      destination: journey.DestinationName ?? null,
      startDate:
        journey.FramedVehicleJourneyRef?.DataFrameRef.replaceAll("-", "") ?? null,
      startTime: null,
      scheduleRelationship: "scheduled",
      stopTimeUpdates,
      progress: isAtStop && monitoredCallStopId
        ? {
            state: "at-stop",
            source: "vehicle",
            stopId: monitoredCallStopId,
            timestamp: recordedAt,
          }
        : nextStopId
          ? {
              state: "approaching",
              source: "vehicle",
              nextStopId,
              previousStopId: null,
              timestamp: recordedAt,
            }
          : { state: "unknown", source: "vehicle", timestamp: recordedAt },
      vehicleId: journey.VehicleRef ?? null,
      updatedAt: recordedAt,
      journeyPatternId: journey.JourneyPatternRef ?? null,
      boardingStopId,
      boardingStopName: options.monitoredStopId ? monitoredCall?.StopPointName ?? null : null,
      nextStopId,
      nextStopName: nextCall?.StopPointName ?? null,
      distanceFromNextStopMeters:
        nextCall?.DistanceFromStop ??
        nextCall?.Extensions?.Distances?.DistanceFromCall ??
        null,
      distanceFromBoardingStopMeters:
        monitoredCall?.DistanceFromStop ?? distanceData?.DistanceFromCall ?? null,
      stopsFromBoardingStop: stopsAway,
      progressStatus: progressText,
    };
    trips.push(trip);

    if (journey.VehicleRef) {
      const location = journey.VehicleLocation;
      vehicles.push({
        id: journey.VehicleRef,
        mode: "bus",
        tripId,
        label: null,
        position: location
          ? {
              source: "actual",
              coordinates: {
                latitude: location.Latitude,
                longitude: location.Longitude,
              },
              bearing: journey.Bearing ?? null,
              speedMetersPerSecond: null,
              timestamp: recordedAt,
            }
          : { source: "unknown", timestamp: recordedAt },
        currentStopId: isAtStop ? monitoredCallStopId : null,
        status: isAtStop ? "stopped" : nextStopId ? "incoming" : "unknown",
      });
    }

    if (departureStopId && departureArrival && departureArrival >= now) {
      departures.push({
        id: `${tripId}:${departureStopId}`,
        mode: "bus",
        tripId,
        routeId,
        stopId: departureStopId,
        stationId: null,
        direction,
        destination: trip.destination,
        predictedArrival: departureArrival,
        predictedDeparture: departureTime,
        delaySeconds: 0,
        status: "realtime",
        minutesAway: Math.max(
          0,
          Math.round((departureArrival.getTime() - now.getTime()) / 60_000),
        ),
        progressText,
        stopsAway,
      });
    }
  }

  departures.sort(
    (a, b) => a.predictedArrival.getTime() - b.predictedArrival.getTime(),
  );
  const feedTimestamp =
    activities
      .map((activity) => parseDate(activity.RecordedAtTime))
      .filter((timestamp): timestamp is Date => timestamp !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const ageMs = feedTimestamp ? now.getTime() - feedTimestamp.getTime() : 0;

  return {
    mode: "bus",
    generatedAt: now,
    feedTimestamp,
    sourceState:
      trips.length === 0
        ? "empty"
        : ageMs > REALTIME_STALE_AFTER_MS
          ? "stale"
          : "ok",
    trips,
    departures,
    vehicles,
  };
}
