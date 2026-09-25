"use client";

/**
 * RealtimeToolbar
 *
 * The single row of page chrome above the map: mode, route, view, and refresh.
 *
 * Deliberately compact so the map keeps the vertical space. On mobile the mode
 * switch and the view toggle share one line and the route picker gets its own,
 * because the subway rail needs full width to scroll.
 */

import { ArrowDown, ArrowUp, RefreshCw, Map as MapIcon, ListTree } from "lucide-react";
import { Button } from "@heroui/react";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui";
import type { TransitMode } from "@/types/mta";
import type { TransitDirection } from "@/types/transit";
import type { LineId } from "@/lib/gtfs/line-stations";
import type { RealtimeView } from "@/lib/transit/deep-link";
import { ModeSelector } from "./ModeSelector";
import { SubwayRouteRail } from "./SubwayRouteRail";
import { BusSelector } from "./BusSelector";
import { RailSelector } from "./RailSelector";

interface RailBranch {
  id: string;
  name: string;
}

/** Toolbar direction filter. `"all"` clears the URL direction param. */
export type DirectionFilter = "all" | "northbound" | "southbound";

export interface RealtimeToolbarProps {
  mode: TransitMode;
  onModeChange: (mode: TransitMode) => void;

  view: RealtimeView;
  onViewChange: (view: RealtimeView) => void;

  routeId: string | null;
  onRouteChange: (routeId: string | null) => void;

  /** Active subway direction filter, from URL state. */
  direction: TransitDirection | undefined;
  onDirectionChange: (direction: TransitDirection | null) => void;

  busRoutes: string[];
  isBusRoutesLoading: boolean;
  railBranches: RailBranch[];
  isRailBranchesLoading: boolean;

  isRefreshing: boolean;
  onRefresh: () => void;
  /** Human-readable "Updated 30 seconds ago", or null before the first load. */
  updatedLabel: string | null;
}

const VIEW_OPTIONS: SegmentedControlOption<RealtimeView>[] = [
  { value: "map", label: "Map", icon: <MapIcon className="h-4 w-4" /> },
  { value: "diagram", label: "Diagram", icon: <ListTree className="h-4 w-4" /> },
];

const DIRECTION_OPTIONS: SegmentedControlOption<DirectionFilter>[] = [
  { value: "all", label: "All" },
  {
    value: "northbound",
    label: "North",
    icon: <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    value: "southbound",
    label: "South",
    icon: <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />,
  },
];

function toDirectionFilter(
  direction: TransitDirection | undefined,
): DirectionFilter {
  if (direction === "northbound" || direction === "southbound") return direction;
  return "all";
}

export function RealtimeToolbar({
  mode,
  onModeChange,
  view,
  onViewChange,
  routeId,
  onRouteChange,
  direction,
  onDirectionChange,
  busRoutes,
  isBusRoutesLoading,
  railBranches,
  isRailBranchesLoading,
  isRefreshing,
  onRefresh,
  updatedLabel,
}: RealtimeToolbarProps) {
  return (
    <div className="flex flex-col gap-2 lg:gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModeSelector
          selectedMode={mode}
          onModeChange={onModeChange}
          availableModes={["subway", "bus", "lirr", "metro-north"]}
          compact
        />

        <div className="flex items-center gap-2">
          {updatedLabel && (
            <span className="hidden text-xs text-foreground/50 sm:inline">
              {updatedLabel}
            </span>
          )}

          <SegmentedControl
            options={VIEW_OPTIONS}
            value={view}
            onChange={onViewChange}
            ariaLabel="Visualization"
          />

          <Button
            isIconOnly
            size="sm"
            variant="flat"
            aria-label="Refresh live data"
            isDisabled={!routeId}
            isLoading={isRefreshing}
            onPress={onRefresh}
            className="h-11 w-11 min-w-11"
          >
            {!isRefreshing && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {mode === "subway" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <SubwayRouteRail
              selectedLine={routeId}
              onSelect={(line) => onRouteChange(line as LineId | null)}
            />
          </div>
          {/* Direction filter only appears once a route is selected — filtering
              an empty map is noise. URL-backed via `?direction=`. */}
          {routeId && (
            <SegmentedControl
              options={DIRECTION_OPTIONS}
              value={toDirectionFilter(direction)}
              onChange={(next) =>
                onDirectionChange(next === "all" ? null : next)
              }
              ariaLabel="Direction filter"
              className="shrink-0"
            />
          )}
        </div>
      ) : mode === "bus" ? (
        <BusSelector
          selectedRoute={routeId}
          onSelectionChange={onRouteChange}
          availableRoutes={busRoutes}
          isLoading={isBusRoutesLoading}
          compact
        />
      ) : (
        <RailSelector
          mode={mode}
          selectedBranch={routeId}
          onSelectionChange={onRouteChange}
          availableBranches={railBranches}
          isLoading={isRailBranchesLoading}
          compact
        />
      )}
    </div>
  );
}
