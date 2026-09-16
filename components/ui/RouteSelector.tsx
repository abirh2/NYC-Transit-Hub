"use client";

/**
 * RouteSelector
 *
 * A multi-select set of transit routes rendered as toggle buttons. Each route
 * reuses an existing transit primitive for its visual — `SubwayBullet` for the
 * subway mode, `BusBadge` for bus, `RailBadge` for rail — so route color and
 * contrast stay single-sourced through `route-colors.ts` and the badge modules.
 *
 * Consumes Layer 2 design tokens (surface, radii, border, focus).
 *
 * Requirements: 7.1, 7.2, 8.4, 14.2, 14.3
 */

import { SubwayBullet } from "@/components/ui/SubwayBullet";
import { BusBadge } from "@/components/ui/BusBadge";
import { RailBadge } from "@/components/ui/RailBadge";
import type { TransitMode } from "@/types/mta";

export interface RouteSelectorProps {
  /** Line ids (subway) or route ids (bus/rail). */
  routes: string[];
  /** Currently selected route ids. */
  selected: string[];
  onToggle: (route: string) => void;
  mode?: "subway" | "bus" | "rail";
  /** Accessible group label. */
  ariaLabel?: string;
  className?: string;
}

/** Map the RouteSelector `rail` mode onto a concrete rail TransitMode. */
const RAIL_MODE: TransitMode = "lirr";

export function RouteSelector({
  routes,
  selected,
  onToggle,
  mode = "subway",
  ariaLabel = "Select routes",
  className = "",
}: RouteSelectorProps) {
  const selectedSet = new Set(selected);

  return (
    <div role="group" aria-label={ariaLabel} className={`flex flex-wrap gap-2 ${className}`}>
      {routes.map((route) => {
        const isSelected = selectedSet.has(route);
        return (
          <button
            key={route}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${route}${isSelected ? " (selected)" : ""}`}
            onClick={() => onToggle(route)}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface-app ${
              isSelected
                ? "border-state-selected bg-surface-selected"
                : "border-border-subtle bg-surface-panel hover:bg-surface-hover"
            }`}
          >
            {mode === "subway" && <SubwayBullet line={route} selected={isSelected} />}
            {mode === "bus" && <BusBadge route={route} />}
            {mode === "rail" && (
              <RailBadge branchId={route} branchName={route} mode={RAIL_MODE} abbreviated />
            )}
          </button>
        );
      })}
    </div>
  );
}
