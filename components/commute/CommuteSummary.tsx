"use client";

/**
 * CommuteSummary Component
 * 
 * Displays real-time commute recommendations including
 * departure time, trip duration, and route summary.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, Chip, Skeleton, Button } from "@heroui/react";
import {
  Clock,
  Timer,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Home,
  Briefcase,
  Footprints,
  RefreshCcw,
  MapPin,
  Navigation,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CommuteRoutePreview, AlternativeRoute, RouteLineSummary } from "./CommuteRoutePreview";

interface RouteLeg {
  mode: string;
  route: string | null;
  from: string;
  to: string;
  duration: number;
  isTransit: boolean;
}

interface RouteItinerary {
  leaveIn: string;
  leaveAt: string;
  arriveBy: string;
  duration: number;
  route: string;
  transfers: number;
  walkTime: number;
  legs: RouteLeg[];
}

interface CommuteSummaryData {
  isAuthenticated: boolean;
  isConfigured: boolean;
  leaveIn: string | null;
  leaveAt: string | null;
  arriveBy: string | null;
  duration: number | null;
  route: string | null;
  transfers?: number;
  walkTime?: number;
  legs?: RouteLeg[];
  status: "on_time" | "delayed" | "early" | null;
  delayMinutes: number | null;
  targetArrival?: string | null;
  isPastWindow?: boolean;
  alternatives?: RouteItinerary[];
  homeAddress?: string | null;
  workAddress?: string | null;
  error?: string;
}

interface CommuteSummaryProps {
  commuteId?: string;
  onSetupClick?: () => void;
}

const REFRESH_INTERVAL = 60; // seconds

export function CommuteSummary({ commuteId, onSetupClick }: CommuteSummaryProps) {
  const [data, setData] = useState<CommuteSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setError(null);

    try {
      const url = commuteId 
        ? `/api/commute/summary?id=${commuteId}` 
        : "/api/commute/summary";
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
      } else {
        setError(result.error || "Failed to fetch commute data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch commute data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [commuteId]);

  // Initial fetch
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => fetchSummary(), REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardBody className="space-y-4 py-6">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </CardBody>
      </Card>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Card>
        <CardBody className="py-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-warning mb-3" />
          <p className="text-foreground/70">{error}</p>
          <Button
            size="sm"
            variant="flat"
            className="mt-4"
            onPress={() => fetchSummary(true)}
          >
            Try Again
          </Button>
        </CardBody>
      </Card>
    );
  }

  // Not configured state
  if (data && !data.isConfigured) {
    return (
      <Card>
        <CardBody className="py-8 text-center">
          <div className="flex justify-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Home className="h-6 w-6 text-success" />
            </div>
            <ArrowRight className="h-6 w-6 text-foreground/30 self-center" />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Set Up Your Commute</h3>
          <p className="text-sm text-foreground/60 mb-4">
            Configure your home and work addresses to get personalized departure suggestions.
          </p>
          {onSetupClick && (
            <Button color="primary" onPress={onSetupClick}>
              Configure Now
            </Button>
          )}
        </CardBody>
      </Card>
    );
  }

  // Configured - show summary
  if (!data) return null;

  const statusConfig = {
    on_time: { color: "success" as const, icon: CheckCircle2, label: "On Time" },
    delayed: { color: "danger" as const, icon: AlertTriangle, label: "Running Late" },
    early: { color: "primary" as const, icon: Clock, label: "Early" },
  };

  const statusInfo = data.status ? statusConfig[data.status] : null;

  return (
    <Card>
      <CardBody className="py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <span className="font-semibold">Your Commute</span>
          </div>
          <div className="flex items-center gap-2">
            {statusInfo && (
              <Chip
                size="sm"
                color={statusInfo.color}
                variant="flat"
                startContent={<statusInfo.icon className="h-3 w-3" />}
              >
                {statusInfo.label}
                {data.delayMinutes && data.status !== "on_time" && ` (${data.delayMinutes} min)`}
              </Chip>
            )}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => fetchSummary(true)}
              isDisabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {data.error ? (
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-sm text-foreground/60">{data.error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* From/To */}
            {(data.homeAddress || data.workAddress) && (
              <div className="flex items-center gap-2 text-sm text-foreground/60 px-1">
                <MapPin className="h-4 w-4 text-success" />
                <span className="truncate max-w-[120px]">{data.homeAddress?.split(",")[0] || "Home"}</span>
                <ArrowRight className="h-3 w-3" />
                <MapPin className="h-4 w-4 text-primary" />
                <span className="truncate max-w-[120px]">{data.workAddress?.split(",")[0] || "Work"}</span>
              </div>
            )}

            {/* Leave In */}
            <div className="text-center py-4 bg-default-50 rounded-xl">
              <p className="text-sm text-foreground/60 mb-1">Leave in</p>
              <p className="text-4xl font-bold text-foreground">
                {data.leaveIn || "--"}
              </p>
              {data.targetArrival && !data.isPastWindow && (
                <p className="text-sm text-foreground/50 mt-1">
                  to arrive by {data.targetArrival}
                </p>
              )}
              {data.isPastWindow && (
                <p className="text-sm text-warning mt-1">
                  Target arrival ({data.targetArrival}) has passed for today
                </p>
              )}
            </div>

            {/* Route Preview with Line Icons */}
            {data.route && (
              <div className="flex items-center justify-center gap-2 py-2">
                <RouteLineSummary route={data.route} />
              </div>
            )}

            {/* Trip Details */}
            <div className="grid grid-cols-3 gap-3">
              {/* Duration */}
              <div className="flex items-center gap-2 p-2 bg-default-50 rounded-lg">
                <Timer className="h-4 w-4 text-foreground/50" />
                <div>
                  <p className="text-xs text-foreground/50">Time</p>
                  <p className="text-sm font-semibold">
                    {data.duration ? `${data.duration} min` : "--"}
                  </p>
                </div>
              </div>

              {/* Transfers */}
              <div className="flex items-center gap-2 p-2 bg-default-50 rounded-lg">
                <RefreshCcw className="h-4 w-4 text-foreground/50" />
                <div>
                  <p className="text-xs text-foreground/50">Transfers</p>
                  <p className="text-sm font-semibold">
                    {data.transfers !== undefined ? data.transfers : "--"}
                  </p>
                </div>
              </div>

              {/* Walking */}
              <div className="flex items-center gap-2 p-2 bg-default-50 rounded-lg">
                <Footprints className="h-4 w-4 text-foreground/50" />
                <div>
                  <p className="text-xs text-foreground/50">Walk</p>
                  <p className="text-sm font-semibold">
                    {data.walkTime ? `${data.walkTime} min` : "--"}
                  </p>
                </div>
              </div>
            </div>

            {/* Route Details */}
            {data.legs && data.legs.length > 0 && (
              <CommuteRoutePreview legs={data.legs} />
            )}

            {/* Arrival Time */}
            {data.arriveBy && (
              <div className="flex items-center justify-between text-sm text-foreground/60 px-1 pt-2 border-t border-divider">
                <span>Estimated arrival</span>
                <span className="font-medium text-foreground">{data.arriveBy}</span>
              </div>
            )}

            {/* Alternative Routes */}
            {data.alternatives && data.alternatives.length > 0 && (
              <div className="pt-4 border-t border-divider">
                <p className="text-sm font-medium text-foreground/70 mb-3">Alternative Routes</p>
                <div className="space-y-2">
                  {data.alternatives.map((alt, idx) => (
                    <AlternativeRoute key={idx} itinerary={alt} index={idx} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {lastUpdated && (
          <div className="flex items-center justify-end gap-1.5 mt-4 text-xs text-foreground/40">
            <Clock className="h-3 w-3" />
            <span>Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

