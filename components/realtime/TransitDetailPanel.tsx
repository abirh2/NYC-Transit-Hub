"use client";

/**
 * TransitDetailPanel
 *
 * Presentation for a `TransitDetailContent`. The same component fills the
 * desktop side panel and the mobile bottom sheet, so a station, vehicle, or
 * route reads identically in both places.
 */

import { AlertCircle, Check, Circle, LocateFixed, X } from "lucide-react";
import { Button } from "@heroui/react";
import { BusBadge, RailBadge, StatusChip, SubwayBullet } from "@/components/ui";
import {
  formatMinutesAway,
  type DetailArrival,
  type RouteBadgeDescriptor,
  type TransitDetailContent,
} from "./detailContent";

export interface TransitDetailPanelProps {
  content: TransitDetailContent;
  /** Omitted in the bottom sheet, where the sheet supplies its own dismissal. */
  onClose?: () => void;
  /** Lets a station's departures select the underlying trip. */
  onSelectArrival?: (arrivalId: string) => void;
  selectedArrivalId?: string;
  onViewFullRoute?: () => void;
}

function RouteBadge({
  descriptor,
  size = "md",
}: {
  descriptor: RouteBadgeDescriptor;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  switch (descriptor.kind) {
    case "subway":
      return <SubwayBullet line={descriptor.line} size={size} />;
    case "bus":
      return <BusBadge route={descriptor.route} size={size} />;
    case "rail":
      return (
        <RailBadge
          branchId={descriptor.branchId}
          branchName={descriptor.branchName}
          mode={descriptor.mode}
          size={size}
          abbreviated
        />
      );
  }
}

function ArrivalRow({
  arrival,
  onSelect,
  isSelected,
}: {
  arrival: DetailArrival;
  onSelect?: (id: string) => void;
  isSelected: boolean;
}) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        {arrival.badge && <RouteBadge descriptor={arrival.badge} size="sm" />}
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {arrival.primary}
          </span>
          {arrival.secondary && (
            <span className="block truncate text-xs text-foreground/60">
              {arrival.secondary}
            </span>
          )}
        </span>
      </span>
      <span className="tabular shrink-0 text-sm font-semibold text-foreground">
        {formatMinutesAway(arrival.minutesAway)}
      </span>
    </>
  );

  if (!onSelect) {
    return (
      <li className="flex min-h-[44px] items-center justify-between gap-3 px-3 py-2">
        {body}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(arrival.id)}
        aria-current={isSelected ? "true" : undefined}
        aria-label={`${arrival.primary}${arrival.secondary ? `, ${arrival.secondary}` : ""}, ${formatMinutesAway(arrival.minutesAway)}`}
        className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${
          isSelected
            ? "bg-surface-selected"
            : "hover:bg-surface-hover"
        }`}
      >
        {body}
      </button>
    </li>
  );
}

export function TransitDetailPanel({
  content,
  onClose,
  onSelectArrival,
  selectedArrivalId,
  onViewFullRoute,
}: TransitDetailPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          {content.badge && (
            <span className="mt-0.5 shrink-0">
              <RouteBadge descriptor={content.badge} size="lg" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
              {content.eyebrow}
            </p>
            <h2 className="text-balance text-base font-semibold leading-tight text-foreground">
              {content.title}
            </h2>
            {content.subtitle && (
              <p className="mt-0.5 text-xs text-foreground/60">{content.subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {content.status && (
            <StatusChip
              state={content.status.state}
              label={content.status.label}
              size="sm"
            />
          )}
          {onClose && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              aria-label="Close details"
              onPress={onClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {content.notice && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-md border border-state-advisory/40 bg-state-advisory/10 px-3 py-2 text-xs text-foreground/80"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{content.notice}</span>
          </p>
        )}

        {content.serves && content.serves.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
              Routes served
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {content.serves.map((descriptor, index) => (
                <li key={`${descriptor.kind}-${index}`}>
                  <RouteBadge descriptor={descriptor} size="sm" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {content.rows.length > 0 && (
          <dl className="flex flex-col divide-y divide-border-subtle">
            {content.rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3 py-2"
              >
                <dt className="text-xs text-foreground/60">{row.label}</dt>
                <dd className="text-right text-sm font-medium text-foreground">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {content.progressStops && content.progressStops.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-foreground">
              {content.progressTitle ?? "Route progress"}
            </h3>
            <ol className="flex flex-col">
              {content.progressStops.map((stop, index) => {
                const isFocus = stop.state === "current" || stop.state === "next";
                return (
                  <li
                    key={stop.id}
                    className={`relative grid min-h-11 grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 py-1.5 ${
                      isFocus ? "font-medium text-foreground" : "text-foreground/65"
                    }`}
                  >
                    {index < content.progressStops!.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-[0.59375rem] top-7 w-px bg-border-strong"
                      />
                    )}
                    <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-surface-floating">
                      {stop.state === "completed" ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : stop.state === "current" ? (
                        <LocateFixed className="h-4 w-4 text-state-selected" aria-hidden="true" />
                      ) : (
                        <Circle
                          className={`h-3.5 w-3.5 ${
                            stop.state === "next"
                              ? "fill-state-selected text-state-selected"
                              : "text-foreground/35"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <span className="sr-only">{stop.state}</span>
                    </span>
                    <span className="truncate text-sm">{stop.name}</span>
                    {stop.time && (
                      <time className="tabular text-xs text-foreground/55">
                        {stop.time}
                      </time>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {content.arrivals && content.arrivals.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
              {content.arrivalsTitle ?? "Upcoming"}
            </h3>
            <ul className="-mx-3 flex flex-col">
              {content.arrivals.map((arrival) => (
                <ArrivalRow
                  key={arrival.id}
                  arrival={arrival}
                  onSelect={onSelectArrival}
                  isSelected={arrival.id === selectedArrivalId}
                />
              ))}
            </ul>
          </section>
        )}

        {content.secondaryArrivals && content.secondaryArrivals.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
              {content.secondaryArrivalsTitle ?? "Other service"}
            </h3>
            <ul className="-mx-3 flex flex-col">
              {content.secondaryArrivals.map((arrival) => (
                <ArrivalRow
                  key={arrival.id}
                  arrival={arrival}
                  onSelect={onSelectArrival}
                  isSelected={arrival.id === selectedArrivalId}
                />
              ))}
            </ul>
          </section>
        )}

        {content.footnote && (
          <p className="text-[11px] leading-relaxed text-foreground/50">
            {content.footnote}
          </p>
        )}

        {onViewFullRoute && (
          <Button
            variant="flat"
            size="sm"
            className="w-full"
            onPress={onViewFullRoute}
          >
            View full route
          </Button>
        )}
      </div>
    </div>
  );
}
