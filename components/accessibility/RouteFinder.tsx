"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Accessibility,
  ArrowDownUp,
  ChevronDown,
  Clock,
  Footprints,
  LoaderCircle,
} from "lucide-react";

import { BusBadge, LocationSearchField, SubwayBullet, Surface } from "@/components/ui";
import {
  buildPlanQueryString,
  parsePlanQueryState,
  type PlanQueryState,
  type RiderLocationContext,
} from "@/lib/transit/rider-query-state";
import type { LocationSearchResult } from "@/types/location";

interface OTPLeg {
  startTime: number;
  startTimeFmt: string;
  endTime: number;
  endTimeFmt: string;
  mode: "WALK" | "BUS" | "SUBWAY" | "TRAM" | "RAIL" | "FERRY";
  route?: string;
  headsign?: string;
  tripHeadsign?: string;
  duration: number;
  distance: number;
  from: { name: string; lon: number; lat: number };
  to: { name: string; lon: number; lat: number };
  intermediateStops?: Array<{ name: string }>;
  transitLeg: boolean;
}

interface OTPItinerary {
  duration: number;
  startTimeFmt: string;
  endTimeFmt: string;
  walkTime: number;
  transitTime: number;
  waitingTime?: number;
  walkDistance: number;
  transfers: number;
  legs: OTPLeg[];
}

interface TripResponse {
  success: boolean;
  error?: string;
  noPath?: boolean;
  data?: {
    from: { name: string };
    to: { name: string };
    itineraries: OTPItinerary[];
    wheelchair: boolean;
  };
}

type ResultState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "ready"; response: TripResponse & { data: NonNullable<TripResponse["data"]> } }
  | { type: "no-path" }
  | { type: "unavailable" };

function contextToSearchResult(context: RiderLocationContext | null): LocationSearchResult | null {
  if (!context) return null;
  return context.stationId
    ? {
        id: `station:${context.stationId}`,
        kind: "station",
        stationId: context.stationId,
        name: context.name,
        description: "Subway station",
        latitude: context.latitude,
        longitude: context.longitude,
      }
    : {
        id: `query:${context.latitude},${context.longitude}`,
        kind: "place",
        name: context.name,
        description: "New York City",
        latitude: context.latitude,
        longitude: context.longitude,
      };
}

function resultToContext(result: LocationSearchResult | null): RiderLocationContext | null {
  if (!result) return null;
  return {
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    ...(result.kind === "station" ? { stationId: result.stationId } : {}),
  };
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "h:mm a");
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
  return `${miles.toFixed(1)} mi`;
}

function RouteIdentity({ leg }: { leg: OTPLeg }) {
  const route = leg.route?.trim();
  if (!route) return <span className="text-sm font-semibold text-foreground">Transit</span>;
  if (leg.mode === "SUBWAY") return <SubwayBullet line={route} size="sm" />;
  if (leg.mode === "BUS") return <BusBadge route={route} size="sm" />;
  return (
    <span className="rounded-md bg-state-selected px-2 py-1 text-xs font-bold text-white">
      {route}
    </span>
  );
}
function ItineraryResult({ itinerary, index }: { itinerary: OTPItinerary; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const transitLegs = itinerary.legs.filter((leg) => leg.transitLeg);
  const transferLabel = `${itinerary.transfers} transfer${itinerary.transfers === 1 ? "" : "s"}`;

  return (
    <Surface as="article" className="overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="grid min-h-24 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset sm:px-5"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-bold tracking-[-0.03em] tabular-nums text-foreground">
              {formatDuration(itinerary.duration)}
            </span>
            <span className="text-sm text-foreground/65">
              {formatTime(itinerary.startTimeFmt)}–{formatTime(itinerary.endTimeFmt)}
            </span>
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-2">
            {transitLegs.map((leg, legIndex) => (
              <span key={`${leg.route ?? leg.mode}-${legIndex}`} className="inline-flex items-center gap-2">
                {legIndex > 0 && <span className="text-foreground/35" aria-hidden="true">→</span>}
                <RouteIdentity leg={leg} />
              </span>
            ))}
            <span className="text-xs font-medium text-foreground/60">{transferLabel}</span>
            {itinerary.walkDistance > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/60">
                <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
                Walk {formatDistance(itinerary.walkDistance)}
              </span>
            )}
            {(itinerary.waitingTime ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/60">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDuration(itinerary.waitingTime ?? 0)} wait
              </span>
            )}
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 text-foreground/50 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {expanded && (
        <ol className="border-t border-border-subtle px-4 py-2 sm:px-5">
          {itinerary.legs.map((leg, legIndex) => {
            const destination = leg.headsign || leg.tripHeadsign || leg.to.name;
            return (
              <li key={`${leg.mode}-${legIndex}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-border-subtle py-3 last:border-b-0">
                <span className="pt-0.5">
                  {leg.transitLeg ? <RouteIdentity leg={leg} /> : <Footprints className="h-5 w-5 text-foreground/60" aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {leg.transitLeg ? destination : `Walk ${formatDistance(leg.distance)}`}
                  </span>
                  <span className="mt-0.5 block text-xs text-foreground/60">
                    {leg.from.name} to {leg.to.name} · {formatDuration(leg.duration)}
                    {leg.intermediateStops?.length
                      ? ` · ${leg.intermediateStops.length} stop${leg.intermediateStops.length === 1 ? "" : "s"}`
                      : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Surface>
  );
}

export function RouteFinder() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = parsePlanQueryState(searchParams);
  const [planState, setPlanState] = useState<PlanQueryState>(initial);
  const [resultState, setResultState] = useState<ResultState>({ type: "idle" });

  const updatePlanState = (next: PlanQueryState) => {
    setPlanState(next);
    setResultState({ type: "idle" });
    const query = buildPlanQueryString(next, new URLSearchParams(searchParams.toString()));
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const planTrip = async () => {
    if (!planState.from || !planState.to) return;
    setResultState({ type: "loading" });
    const params = new URLSearchParams({
      fromLat: String(planState.from.latitude),
      fromLon: String(planState.from.longitude),
      toLat: String(planState.to.latitude),
      toLon: String(planState.to.longitude),
      wheelchair: String(planState.accessible),
      numItineraries: "3",
    });

    try {
      const response = await fetch(`/api/routes/trip?${params.toString()}`);
      const payload = await response.json() as TripResponse;
      if (payload.success && payload.data) {
        setResultState({ type: "ready", response: { ...payload, data: payload.data } });
      } else if (payload.noPath) {
        setResultState({ type: "no-path" });
      } else {
        setResultState({ type: "unavailable" });
      }
    } catch {
      setResultState({ type: "unavailable" });
    }
  };

  return (
    <div className="space-y-6">
      <Surface as="section" className="p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end">
          <LocationSearchField
            label="Where from?"
            value={contextToSearchResult(planState.from)}
            onSelect={(result) => updatePlanState({ ...planState, from: resultToContext(result) })}
            placeholder="NYC street address, station, or landmark"
          />
          <button
            type="button"
            aria-label="Swap origin and destination"
            onClick={() => updatePlanState({ ...planState, from: planState.to, to: planState.from })}
            disabled={!planState.from && !planState.to}
            className="flex min-h-11 min-w-11 items-center justify-center justify-self-center rounded-lg text-foreground/65 hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40 md:mb-0.5"
          >
            <ArrowDownUp className="h-5 w-5 md:rotate-90" aria-hidden="true" />
          </button>
          <LocationSearchField
            label="Where to?"
            value={contextToSearchResult(planState.to)}
            onSelect={(result) => updatePlanState({ ...planState, to: resultToContext(result) })}
            placeholder="NYC street address, station, or landmark"
          />
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={planState.accessible}
              onChange={(event) => updatePlanState({ ...planState, accessible: event.target.checked })}
              className="h-5 w-5 rounded border-border-strong accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
            <Accessibility className="h-4 w-4 text-primary" aria-hidden="true" />
            Step-free routes only
          </label>
          <button
            type="button"
            aria-label="Plan trip"
            onClick={() => void planTrip()}
            disabled={!planState.from || !planState.to || resultState.type === "loading"}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-45"
          >
            {resultState.type === "loading" && <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {resultState.type === "loading" ? "Planning…" : "Plan"}
          </button>
        </div>
      </Surface>

      {resultState.type === "no-path" && (
        <div role="status" className="rounded-lg bg-state-advisory/10 px-4 py-5">
          <h2 className="font-semibold text-foreground">No supported route found</h2>
          <p className="mt-1 text-sm text-foreground/65">Try a nearby station or a different destination.</p>
        </div>
      )}
      {resultState.type === "unavailable" && (
        <div role="alert" className="rounded-lg bg-state-severe/10 px-4 py-5">
          <h2 className="font-semibold text-foreground">Trip planning is unavailable</h2>
          <p className="mt-1 text-sm text-foreground/65">Your locations are saved. Try planning again shortly.</p>
        </div>
      )}
      {resultState.type === "ready" && (
        <section aria-labelledby="plan-results-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="plan-results-heading" className="text-lg font-semibold text-foreground">
              {resultState.response.data.itineraries.length} route{resultState.response.data.itineraries.length === 1 ? "" : "s"}
            </h2>
            <p className="text-xs text-foreground/60">Live conditions can change while you travel.</p>
          </div>
          {resultState.response.data.itineraries.map((itinerary, index) => (
            <ItineraryResult key={`${itinerary.startTimeFmt}-${index}`} itinerary={itinerary} index={index} />
          ))}
        </section>
      )}
    </div>
  );
}
