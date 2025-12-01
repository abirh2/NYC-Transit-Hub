"use client";

/**
 * CommuteRoutePreview Component
 * 
 * Displays a visual route preview with subway line icons and walking segments.
 */

import { useState } from "react";
import { Card, CardBody, Chip } from "@heroui/react";
import { Footprints, ArrowRight, Clock, RefreshCcw, ChevronDown } from "lucide-react";
import { SubwayBullet } from "@/components/ui";

interface RouteLeg {
  mode: string;
  route: string | null;
  from: string;
  to: string;
  duration: number;
  isTransit: boolean;
  departureTime?: string;
  arrivalTime?: string;
}

interface RouteItinerary {
  leaveIn: string;
  leaveAt: string;
  arriveBy: string;
  duration: number;
  route: string;
  transfers: number;
  walkTime: number;
  legs?: RouteLeg[];
}

interface CommuteRoutePreviewProps {
  legs: RouteLeg[];
  className?: string;
}

interface AlternativeRouteProps {
  itinerary: RouteItinerary;
  index: number;
}

/**
 * Main route preview showing all legs with times
 */
export function CommuteRoutePreview({ legs, className }: CommuteRoutePreviewProps) {
  if (!legs || legs.length === 0) return null;

  // Find the first transit leg to show "be at station by" info
  const firstTransitLeg = legs.find(leg => leg.isTransit);

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <p className="text-sm font-medium text-foreground/70">Route Details</p>
      
      {/* Key info: be at station by time */}
      {firstTransitLeg && (
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm">
            <span className="text-foreground/70">Be at </span>
            <span className="font-semibold text-foreground">{firstTransitLeg.from}</span>
            <span className="text-foreground/70"> by </span>
            <span className="font-semibold text-primary">{firstTransitLeg.departureTime}</span>
          </p>
        </div>
      )}

      {/* Step by step breakdown */}
      <div className="space-y-2">
        {legs.map((leg, idx) => (
          <LegDetailRow key={idx} leg={leg} stepNumber={idx + 1} />
        ))}
      </div>
    </div>
  );
}

/**
 * Detailed leg row showing station and times
 */
function LegDetailRow({ leg, stepNumber }: { leg: RouteLeg; stepNumber: number }) {
  if (leg.mode === "WALK") {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-default-200 text-xs font-medium shrink-0">
          {stepNumber}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Footprints className="h-4 w-4 text-foreground/50" />
            <span className="text-sm">Walk to {leg.to}</span>
          </div>
          <p className="text-xs text-foreground/50 mt-0.5">
            {leg.duration} min · {leg.departureTime} → {leg.arrivalTime}
          </p>
        </div>
      </div>
    );
  }

  if (leg.isTransit && leg.route) {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-default-200 text-xs font-medium shrink-0">
          {stepNumber}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <LineBadge line={leg.route} />
            <span className="text-sm font-medium truncate">{leg.from}</span>
            <ArrowRight className="h-3 w-3 text-foreground/30 shrink-0" />
            <span className="text-sm font-medium truncate">{leg.to}</span>
          </div>
          <p className="text-xs text-foreground/50 mt-0.5">
            {leg.duration} min · Depart {leg.departureTime} → Arrive {leg.arrivalTime}
          </p>
        </div>
      </div>
    );
  }

  // Other modes
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-default-200 text-xs font-medium shrink-0">
        {stepNumber}
      </div>
      <div className="flex-1">
        <p className="text-sm">{leg.route || leg.mode}: {leg.from} → {leg.to}</p>
        <p className="text-xs text-foreground/50">{leg.duration} min</p>
      </div>
    </div>
  );
}

/**
 * Individual leg display
 */
function LegDisplay({ leg }: { leg: RouteLeg }) {
  if (leg.mode === "WALK") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-default-100 rounded-lg">
        <Footprints className="h-4 w-4 text-foreground/50" />
        <span className="text-xs text-foreground/70">{leg.duration} min</span>
      </div>
    );
  }

  if (leg.isTransit && leg.route) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-default-100 rounded-lg">
        <LineBadge line={leg.route} />
        <div className="text-xs">
          <span className="text-foreground/70">{leg.duration} min</span>
        </div>
      </div>
    );
  }

  // Other modes (bus, etc.)
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-default-100 rounded-lg">
      <span className="text-xs font-medium">{leg.route || leg.mode}</span>
      <span className="text-xs text-foreground/70">{leg.duration} min</span>
    </div>
  );
}

// Subway lines that should use SubwayBullet
const SUBWAY_LINES = new Set([
  "1", "2", "3", "4", "5", "6", "7",
  "A", "C", "E", "B", "D", "F", "M",
  "G", "J", "Z", "L", "N", "Q", "R", "W",
  "S", "SIR", "SI"
]);

/**
 * Check if a route is a subway line
 */
function isSubwayLine(route: string): boolean {
  return SUBWAY_LINES.has(route.toUpperCase());
}

/**
 * Display a single route/line with appropriate styling
 */
function LineBadge({ line }: { line: string }) {
  if (isSubwayLine(line)) {
    return <SubwayBullet line={line} size="sm" />;
  }
  
  // Metro-North, LIRR, Bus, etc. - show as a styled chip
  return (
    <span className="px-2 py-0.5 text-xs font-medium bg-default-200 text-foreground rounded-md">
      {line}
    </span>
  );
}

/**
 * Compact route summary for list display
 */
export function RouteLineSummary({ route }: { route: string }) {
  const lines = route.split(" → ");
  
  return (
    <div className="flex items-center gap-1">
      {lines.map((line, idx) => (
        <div key={idx} className="flex items-center gap-1">
          {idx > 0 && <ArrowRight className="h-3 w-3 text-foreground/30" />}
          <LineBadge line={line} />
        </div>
      ))}
    </div>
  );
}

/**
 * Alternative route card - expandable to show details
 */
export function AlternativeRoute({ itinerary, index }: AlternativeRouteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const firstTransitLeg = itinerary.legs?.find(leg => leg.isTransit);

  return (
    <Card 
      className="w-full bg-default-50 cursor-pointer hover:bg-default-100 transition-colors"
      isPressable
      onPress={() => setIsExpanded(!isExpanded)}
    >
      <CardBody className="py-4 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-default-200 text-sm font-medium shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <RouteLineSummary route={itinerary.route} />
              <div className="flex items-center gap-4 mt-1.5 text-sm text-foreground/60">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {itinerary.duration} min
                </span>
                {itinerary.transfers > 0 && (
                  <span className="flex items-center gap-1.5">
                    <RefreshCcw className="h-3.5 w-3.5" />
                    {itinerary.transfers} transfer{itinerary.transfers > 1 ? "s" : ""}
                  </span>
                )}
                {itinerary.walkTime > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Footprints className="h-3.5 w-3.5" />
                    {itinerary.walkTime} min walk
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right flex items-center gap-3 shrink-0">
            <div>
              <p className="text-base font-semibold">{itinerary.leaveIn}</p>
              <p className="text-sm text-foreground/50">arr. {itinerary.arriveBy}</p>
            </div>
            <ChevronDown className={`h-5 w-5 text-foreground/40 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && itinerary.legs && itinerary.legs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-divider">
            {/* Key info */}
            {firstTransitLeg && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4">
                <p className="text-sm">
                  <span className="text-foreground/70">Be at </span>
                  <span className="font-semibold text-foreground">{firstTransitLeg.from}</span>
                  <span className="text-foreground/70"> by </span>
                  <span className="font-semibold text-primary">{firstTransitLeg.departureTime}</span>
                </p>
              </div>
            )}

            {/* Step by step */}
            <div className="space-y-3">
              {itinerary.legs.map((leg, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-default-200 text-xs font-medium shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {leg.mode === "WALK" ? (
                      <div>
                        <p className="text-foreground">Walk to {leg.to}</p>
                        <p className="text-foreground/50 text-xs mt-0.5">
                          {leg.duration} min · {leg.departureTime} → {leg.arrivalTime}
                        </p>
                      </div>
                    ) : leg.isTransit && leg.route ? (
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <LineBadge line={leg.route} />
                          <span className="font-medium">{leg.from}</span>
                          <ArrowRight className="h-3 w-3 text-foreground/30 shrink-0" />
                          <span className="font-medium">{leg.to}</span>
                        </div>
                        <p className="text-foreground/50 text-xs mt-0.5">
                          {leg.duration} min · Depart {leg.departureTime} → Arrive {leg.arrivalTime}
                        </p>
                      </div>
                    ) : (
                      <p>{leg.route || leg.mode}: {leg.from} → {leg.to}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Full route details card
 */
export function FullRouteDetails({ legs, from, to }: { legs: RouteLeg[]; from: string; to: string }) {
  if (!legs || legs.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Chip size="sm" variant="flat" color="success">Start</Chip>
        <span className="text-foreground/70 truncate">{from}</span>
      </div>
      
      {legs.map((leg, idx) => (
        <div key={idx} className="ml-4 border-l-2 border-default-200 pl-4 py-2">
          <div className="flex items-center gap-2">
            {leg.isTransit && leg.route ? (
              <>
                <LineBadge line={leg.route} />
                <span className="text-sm font-medium">{leg.from}</span>
                <ArrowRight className="h-3 w-3 text-foreground/30" />
                <span className="text-sm font-medium">{leg.to}</span>
              </>
            ) : (
              <>
                <Footprints className="h-4 w-4 text-foreground/50" />
                <span className="text-sm text-foreground/70">
                  Walk to {leg.to}
                </span>
              </>
            )}
            <span className="text-xs text-foreground/50 ml-auto">{leg.duration} min</span>
          </div>
        </div>
      ))}
      
      <div className="flex items-center gap-2 text-sm">
        <Chip size="sm" variant="flat" color="primary">End</Chip>
        <span className="text-foreground/70 truncate">{to}</span>
      </div>
    </div>
  );
}

