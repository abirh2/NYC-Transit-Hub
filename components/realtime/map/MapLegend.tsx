"use client";

/**
 * MapLegend
 *
 * Explains the map's visual language, extracted from the ~260-line legend that
 * was inlined in the Realtime page header.
 *
 * The legend is organized around the one rule the marker design depends on:
 * route color identifies the route, marker orientation carries direction, and
 * green/amber/red are reserved for service condition.
 */

import { X } from "lucide-react";
import { Button } from "@heroui/react";
import { SubwayBullet } from "@/components/ui";
import type { TransitMode } from "@/types/mta";

export interface MapLegendProps {
  mode: TransitMode;
  onClose: () => void;
}

interface LegendRow {
  swatch: React.ReactNode;
  label: string;
}

function LegendSection({ title, rows }: { title: string; rows: LegendRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
        {title}
      </h4>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3 text-xs">
            <span className="flex w-12 shrink-0 items-center justify-center">
              {row.swatch}
            </span>
            <span className="text-foreground/80">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Miniature of the real marker, reusing the shared `.rt-marker` styles. */
function MarkerSample({
  children,
  variant,
  status,
  selected,
}: {
  children: React.ReactNode;
  variant: "subway" | "bus" | "rail";
  status?: "arriving" | "delay" | "severe" | "stale";
  selected?: boolean;
}) {
  return (
    <span
      className={`rt-marker rt-marker--${variant}${
        status ? ` rt-marker--${status}` : ""
      }${selected ? " rt-marker--selected" : ""}`}
      style={{ width: "auto", height: "auto", display: "inline-flex" }}
    >
      {children}
    </span>
  );
}

const CHEVRON = (
  <span className="rt-marker__chevron" aria-hidden="true">
    <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor">
      <path d="M5 0 L9.5 9 L5 6.8 L0.5 9 Z" />
    </svg>
  </span>
);

function subwayRows(): LegendRow[] {
  return [
    {
      swatch: (
        <MarkerSample variant="subway">
          <SubwayBullet line="A" size="sm" />
          {CHEVRON}
        </MarkerSample>
      ),
      label: "Train on its route. The chevron points the way it is travelling.",
    },
    {
      swatch: (
        <MarkerSample variant="subway" selected>
          <SubwayBullet line="A" size="sm" />
        </MarkerSample>
      ),
      label: "Selected train or vehicle",
    },
  ];
}

function busRows(): LegendRow[] {
  return [
    {
      swatch: (
        <MarkerSample variant="bus">
          <span
            className="rt-marker__puck"
            style={{ background: "#0039A6", color: "#ffffff" }}
          >
            M15
          </span>
          {CHEVRON}
        </MarkerSample>
      ),
      label: "Bus at its reported GPS position, rotated to its heading",
    },
    {
      swatch: <span className="h-1 w-10 rounded-pill bg-mta-blue" />,
      label: "Bus route path from GTFS shapes (geographically accurate)",
    },
  ];
}

function railRows(mode: "lirr" | "metro-north"): LegendRow[] {
  return [
    {
      swatch: (
        <MarkerSample variant="rail">
          <span
            className="rt-marker__glyph"
            style={{ background: "#0039A6", color: "#ffffff" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 11V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4" />
              <path d="M4 15v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              <path d="M4 11h16v4H4z" />
            </svg>
          </span>
          <span className="rt-marker__label">1234</span>
          {CHEVRON}
        </MarkerSample>
      ),
      label: "Train, labelled with its train number",
    },
    {
      swatch: <span className="text-[11px] font-semibold">In / Out</span>,
      label:
        mode === "lirr"
          ? "Inbound runs toward Penn Station; outbound runs away from it"
          : "Inbound runs toward Grand Central; outbound runs away from it",
    },
  ];
}

const CONDITION_ROWS: LegendRow[] = [
  {
    swatch: (
      <MarkerSample variant="subway" status="arriving">
        <SubwayBullet line="A" size="sm" />
        <span className="rt-marker__status" aria-hidden="true" />
      </MarkerSample>
    ),
    label: "Arriving at its next stop within a minute",
  },
  {
    swatch: (
      <MarkerSample variant="subway" status="delay">
        <SubwayBullet line="A" size="sm" />
        <span className="rt-marker__status" aria-hidden="true" />
      </MarkerSample>
    ),
    label: "Running late (2 minutes or more)",
  },
  {
    swatch: (
      <MarkerSample variant="subway" status="severe">
        <SubwayBullet line="A" size="sm" />
        <span className="rt-marker__status" aria-hidden="true" />
      </MarkerSample>
    ),
    label: "Significantly delayed (10 minutes or more)",
  },
  {
    swatch: (
      <MarkerSample variant="subway" status="stale">
        <SubwayBullet line="A" size="sm" />
        <span className="rt-marker__status" aria-hidden="true" />
      </MarkerSample>
    ),
    label: "Position may be out of date",
  },
];

const STATION_ROWS: LegendRow[] = [
  {
    swatch: (
      <span className="h-4 w-4 rounded-full border-[3px] border-mta-blue bg-surface-app" />
    ),
    label: "Terminal or transfer hub",
  },
  {
    swatch: (
      <span className="h-3 w-3 rounded-full border-2 border-mta-blue bg-surface-app" />
    ),
    label: "Station or stop on the active route",
  },
  {
    swatch: <span className="h-4 w-4 rounded-full border-[3px] border-state-selected bg-mta-blue" />,
    label: "Selected station. Names appear as you zoom in.",
  },
];

export function MapLegend({ mode, onClose }: MapLegendProps) {
  const modeRows =
    mode === "subway"
      ? subwayRows()
      : mode === "bus"
        ? busRows()
        : railRows(mode);

  return (
    <aside
      aria-label="Map legend"
      className="absolute bottom-3 right-3 z-[600] flex max-h-[min(28rem,70%)] w-[min(20rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-lg border border-border-strong bg-surface-floating pb-[env(safe-area-inset-bottom)]"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Legend</h3>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          aria-label="Close legend"
          onPress={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4">
        <LegendSection title="Vehicles" rows={modeRows} />
        <LegendSection title="Service condition" rows={CONDITION_ROWS} />
        <LegendSection title="Stations" rows={STATION_ROWS} />

        {mode !== "bus" && (
          <p className="rounded-md border border-border-subtle bg-surface-hover px-3 py-2 text-[11px] leading-relaxed text-foreground/60">
            Route lines connect stations in order and are approximate, not exact
            track alignment. Vehicle positions are estimated from arrival
            predictions, since these feeds do not report GPS.
          </p>
        )}
      </div>
    </aside>
  );
}
