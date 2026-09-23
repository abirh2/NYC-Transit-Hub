"use client";

import { Button, Skeleton } from "@heroui/react";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  LocateFixed,
  MapPinned,
  Navigation,
} from "lucide-react";
import Link from "next/link";

import { CrowdingCard } from "@/components/dashboard/CrowdingCard";
import { IncidentsCard } from "@/components/dashboard/IncidentsCard";
import { ReliabilityCard } from "@/components/dashboard/ReliabilityCard";
import { parseTrainReferences } from "@/components/dashboard/AlertsCard";
import type {
  HomeCommuteSummary,
  SavedStationSnapshot,
} from "@/components/dashboard/home-types";
import { NearbyDepartureRow } from "@/components/nearby/NearbyDepartureRow";
import { BusBadge, StatusChip, SubwayBullet, Surface } from "@/components/ui";
import type { GeolocationPermissionState } from "@/lib/hooks/useGeolocation";
import type { NearbyService } from "@/lib/transit/nearby";
import { buildPlanQueryString } from "@/lib/transit/rider-query-state";
import type { ServiceAlert, ServiceStatus } from "@/types/transit";

interface HomeSectionsProps {
  now: Date;
  nearbyServices: NearbyService[];
  nearbyLoading: boolean;
  nearbyError: string | null;
  locationError: string | null;
  locationPermission: GeolocationPermissionState;
  locationLoading: boolean;
  onRequestLocation: () => void;
  favoritesLoaded: boolean;
  savedStations: SavedStationSnapshot[];
  commute: HomeCommuteSummary | null;
  commuteLoading: boolean;
  commuteError: string | null;
  alerts: ServiceAlert[];
  alertsLoading: boolean;
  alertsError: string | null;
  routeStatuses: ServiceStatus[];
  planOrigin: { name: string; latitude: number; longitude: number } | null;
}

const SUBWAY_ROUTES = new Set([
  "1", "2", "3", "4", "5", "6", "7", "A", "B", "C", "D", "E", "F",
  "G", "J", "L", "M", "N", "Q", "R", "S", "SI", "SIR", "W", "Z",
]);

const STATUS_PRESENTATION: Record<
  ServiceStatus["status"],
  { label: string; state: "normal" | "advisory" | "delay" | "severe" | "unavailable" }
> = {
  "good-service": { label: "Good service", state: "normal" },
  "planned-work": { label: "Planned work", state: "advisory" },
  delays: { label: "Delays", state: "delay" },
  suspended: { label: "Suspended", state: "severe" },
  unknown: { label: "Check service", state: "unavailable" },
};

function RouteBadge({ routeId }: { routeId: string }) {
  return SUBWAY_ROUTES.has(routeId) ? (
    <SubwayBullet line={routeId} size="sm" />
  ) : (
    <BusBadge route={routeId} size="sm" />
  );
}

function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-4 sm:px-5">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}

function DepartureSkeleton() {
  return (
    <div aria-label="Loading departures" aria-busy="true" className="divide-y divide-border-subtle">
      {[0, 1, 2].map((index) => (
        <div key={index} className="grid min-h-20 grid-cols-[1.5rem_1fr_3.5rem] items-center gap-3 px-4 py-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <span className="space-y-2">
            <Skeleton className="h-3 w-3/5 rounded-sm" />
            <Skeleton className="h-3 w-4/5 rounded-sm" />
          </span>
          <Skeleton className="h-9 w-12 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

function NearbySection({
  now,
  services,
  loading,
  error,
  locationError,
  permission,
  locationLoading,
  onRequestLocation,
}: {
  now: Date;
  services: NearbyService[];
  loading: boolean;
  error: string | null;
  locationError: string | null;
  permission: GeolocationPermissionState;
  locationLoading: boolean;
  onRequestLocation: () => void;
}) {
  const canRequest = permission !== "unsupported";
  return (
    <Surface as="section" className="overflow-hidden">
      <SectionHeading
        title="Near you"
        action={(
          <Link href="/nearby" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
            See all nearby <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      />
      {loading ? (
        <DepartureSkeleton />
      ) : services.length > 0 ? (
        <div className="border-t border-border-subtle">
          {services.slice(0, 4).map((service) => (
            <NearbyDepartureRow
              key={service.id}
              service={service}
              now={now}
              variant="compact"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 border-t border-border-subtle px-4 py-4 sm:px-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-state-delay" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Realtime is temporarily unavailable</p>
            <p className="mt-1 text-sm text-foreground/65">Your saved transit and service alerts are still available.</p>
            <Link href="/nearby" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Open Nearby <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-start gap-3">
            <LocateFixed className="mt-0.5 h-5 w-5 shrink-0 text-foreground/55" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">
                {locationError
                  ? "We couldn’t get your location"
                  : permission === "denied"
                    ? "Location access is off"
                    : "Find transit around you"}
              </p>
              <p className="mt-0.5 text-sm text-foreground/60">
                {locationError
                  ? "Try again or open Nearby to search by place."
                  : permission === "unsupported"
                  ? "Use saved stations or open Nearby to search the map."
                  : "Use your current location for the closest departures."}
              </p>
            </div>
          </div>
          {canRequest && (
            <Button
              size="sm"
              variant="solid"
              color="primary"
              onPress={onRequestLocation}
              isLoading={locationLoading}
              startContent={<LocateFixed className="h-4 w-4" aria-hidden="true" />}
            >
              {permission === "denied" || locationError ? "Try location again" : "Use my location"}
            </Button>
          )}
        </div>
      )}
    </Surface>
  );
}

function SavedTransitSection({
  stations,
  loaded,
  now,
}: {
  stations: SavedStationSnapshot[];
  loaded: boolean;
  now: Date;
}) {
  return (
    <Surface as="section" className="overflow-hidden">
      <SectionHeading
        title="Saved transit"
        action={(
          <Link href="/board" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Manage <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      />
      {!loaded ? (
        <div className="px-4 pb-4 sm:px-5"><Skeleton className="h-16 rounded-md" /></div>
      ) : stations.length === 0 ? (
        <div className="flex items-center justify-between gap-4 border-t border-border-subtle px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <MapPinned className="h-5 w-5 text-foreground/50" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">No saved stations yet</p>
              <p className="text-sm text-foreground/60">Save a station for a faster fallback when location is off.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border-strong border-t border-border-subtle">
          {stations.map((station) => (
            <article key={station.stationId}>
              <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                <h3 className="min-w-0 truncate font-semibold text-foreground">{station.stationName}</h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  {station.routeIds.slice(0, 4).map((routeId) => (
                    <RouteBadge key={routeId} routeId={routeId} />
                  ))}
                </div>
              </div>
              {station.error ? (
                <p className="px-4 pb-4 text-sm text-state-delay sm:px-5">Saved-station realtime is unavailable.</p>
              ) : station.services.length > 0 ? (
                station.services.slice(0, 2).map((service) => (
                  <NearbyDepartureRow key={service.id} service={service} now={now} variant="compact" />
                ))
              ) : (
                <p className="px-4 pb-4 text-sm text-foreground/60 sm:px-5">No upcoming trains found.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </Surface>
  );
}

function CommuteSection({
  commute,
  loading,
  error,
}: {
  commute: HomeCommuteSummary | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return <Skeleton aria-label="Loading commute" className="h-28 rounded-lg" />;
  }

  if (error) {
    return (
      <Surface as="section" className="flex min-h-20 items-center gap-3 px-4 py-3 sm:px-5">
        <AlertTriangle className="h-5 w-5 shrink-0 text-state-delay" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-foreground">Commute unavailable</h2>
          <p className="text-sm text-foreground/60">Open Commute to try again.</p>
        </div>
      </Surface>
    );
  }

  if (!commute?.isConfigured) {
    return (
      <Link
        href="/commute"
        className="flex min-h-20 items-center justify-between gap-4 rounded-lg border border-border-subtle bg-surface-panel px-4 py-3 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:px-5"
      >
        <span className="flex items-center gap-3">
          <Clock3 className="h-5 w-5 text-foreground/50" aria-hidden="true" />
          <span>
            <span className="block font-semibold text-foreground">Set up your commute</span>
            <span className="block text-sm text-foreground/60">See leave times and service for your usual trip.</span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-foreground/50" aria-hidden="true" />
      </Link>
    );
  }

  const status = commute.status === "delayed"
    ? { label: "Running late", state: "delay" as const }
    : { label: "On time", state: "normal" as const };

  return (
    <Surface as="section" className="px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Morning commute</h2>
          <p className="mt-0.5 text-sm text-foreground/60">Home to work · {commute.route ?? "Transit route"}</p>
        </div>
        <StatusChip state={status.state} label={status.label} size="sm" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-bold tracking-[-0.03em] text-foreground tabular-nums">
            Leave in {commute.leaveIn ?? "--"}
          </p>
          <p className="mt-1 text-sm text-foreground/60">
            {commute.arriveBy ? `Arrive by ${commute.arriveBy}` : "Open your commute for the latest route"}
          </p>
        </div>
        <Link href="/commute" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Details <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </Surface>
  );
}

function ServiceOverview({
  statuses,
  unavailable,
}: {
  statuses: ServiceStatus[];
  unavailable: boolean;
}) {
  return (
    <Surface as="section" className="overflow-hidden">
      <SectionHeading title="Service on your routes" />
      {unavailable ? (
        <div className="flex items-start gap-3 border-t border-border-subtle px-4 py-4 sm:px-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-state-delay" aria-hidden="true" />
          <p className="text-sm text-foreground/70">Route status is temporarily unavailable.</p>
        </div>
      ) : statuses.length === 0 ? (
        <p className="border-t border-border-subtle px-4 py-4 text-sm text-foreground/60 sm:px-5">
          Add a saved station or enable location to personalize service status.
        </p>
      ) : (
        <div className="divide-y divide-border-subtle border-t border-border-subtle">
          {statuses.slice(0, 6).map((status) => {
            const presentation = STATUS_PRESENTATION[status.status];
            return (
              <div key={status.routeId} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                <RouteBadge routeId={status.routeId} />
                <StatusChip state={presentation.state} label={presentation.label} size="sm" />
              </div>
            );
          })}
        </div>
      )}
      <Link href="/incidents" className="flex min-h-11 items-center justify-between border-t border-border-subtle px-4 text-sm font-semibold text-primary hover:bg-surface-hover sm:px-5">
        Full service information <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Surface>
  );
}

function RelevantAlerts({
  alerts,
  loading,
  error,
}: {
  alerts: ServiceAlert[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <Surface as="section" className="overflow-hidden">
      <SectionHeading title="What to know" />
      {loading ? (
        <div className="space-y-3 border-t border-border-subtle px-4 py-4 sm:px-5">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 border-t border-border-subtle px-4 py-4 sm:px-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-state-delay" aria-hidden="true" />
          <p className="text-sm text-foreground/70">Service alerts are temporarily unavailable.</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex items-center gap-3 border-t border-border-subtle px-4 py-4 sm:px-5">
          <span className="h-2.5 w-2.5 rounded-full bg-state-normal" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">No active alerts for your routes</p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle border-t border-border-subtle">
          {alerts.slice(0, 3).map((alert) => (
            <article key={alert.id} className="px-4 py-3 sm:px-5">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {alert.affectedRoutes.slice(0, 4).map((routeId) => (
                  <RouteBadge key={routeId} routeId={routeId} />
                ))}
                <StatusChip
                  state={alert.severity === "SEVERE" ? "severe" : alert.severity === "WARNING" ? "delay" : "advisory"}
                  label={alert.severity === "SEVERE" ? "Major" : alert.severity === "WARNING" ? "Delay" : "Info"}
                  size="sm"
                />
              </div>
              <div className="text-sm leading-relaxed text-foreground/80">{parseTrainReferences(alert.headerText)}</div>
            </article>
          ))}
        </div>
      )}
    </Surface>
  );
}

export function HomeSections({
  now,
  nearbyServices,
  nearbyLoading,
  nearbyError,
  locationError,
  locationPermission,
  locationLoading,
  onRequestLocation,
  favoritesLoaded,
  savedStations,
  commute,
  commuteLoading,
  commuteError,
  alerts,
  alertsLoading,
  alertsError,
  routeStatuses,
  planOrigin,
}: HomeSectionsProps) {
  const prioritizePersonalTransit = !nearbyLoading
    && nearbyServices.length === 0
    && (savedStations.length > 0 || commute?.isConfigured === true);
  const nearbySection = (
    <NearbySection
      now={now}
      services={nearbyServices}
      loading={nearbyLoading}
      error={nearbyError}
      locationError={locationError}
      permission={locationPermission}
      locationLoading={locationLoading}
      onRequestLocation={onRequestLocation}
    />
  );
  const savedSection = (
    <SavedTransitSection stations={savedStations} loaded={favoritesLoaded} now={now} />
  );
  const commuteSection = (
    <CommuteSection commute={commute} loading={commuteLoading} error={commuteError} />
  );
  const serviceSection = (
    <ServiceOverview statuses={routeStatuses} unavailable={Boolean(alertsError)} />
  );
  const alertsSection = (
    <RelevantAlerts alerts={alerts} loading={alertsLoading} error={alertsError} />
  );

  return (
    <div className="space-y-8 pb-6 lg:space-y-10">
      <header className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">Your next ride</h1>
          <p className="mt-1 max-w-2xl text-sm text-foreground/65 sm:text-base">
            Live departures, saved transit, and the service changes that matter to you.
          </p>
        </div>
        <Link
          href={`/routes${planOrigin ? `?${buildPlanQueryString({ from: planOrigin, to: null, accessible: false })}` : ""}`}
          className="inline-flex min-h-12 items-center justify-between gap-4 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:min-w-56"
        >
          <span className="inline-flex items-center gap-2"><Navigation className="h-4 w-4" aria-hidden="true" /> Where to?</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.85fr)]">
        {prioritizePersonalTransit ? (
          <>
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              {savedSection}
            </div>
            <div className="min-w-0 lg:col-start-2 lg:row-start-1">
              {serviceSection}
            </div>
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              {commuteSection}
            </div>
            <div className="min-w-0 lg:col-start-2 lg:row-start-2 lg:row-span-2">
              {alertsSection}
            </div>
            <div className="min-w-0 lg:col-start-1 lg:row-start-3">
              {nearbySection}
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              {nearbySection}
            </div>
            <div className="min-w-0 lg:col-start-2 lg:row-start-1">
              {serviceSection}
            </div>
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              {savedSection}
            </div>
            <div className="min-w-0 lg:col-start-2 lg:row-start-2 lg:row-span-2">
              {alertsSection}
            </div>
            <div className="min-w-0 lg:col-start-1 lg:row-start-3">
              {commuteSection}
            </div>
          </>
        )}
      </div>

      <section aria-labelledby="transit-intelligence-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="transit-intelligence-heading" className="text-xl font-semibold tracking-[-0.02em] text-foreground">
              Transit intelligence
            </h2>
            <p className="mt-1 text-sm text-foreground/60">A wider view of reliability, incidents, and crowding.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ReliabilityCard />
          <IncidentsCard />
          <CrowdingCard />
        </div>
      </section>
    </div>
  );
}

export type { HomeSectionsProps };
