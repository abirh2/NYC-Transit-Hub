"use client";

/**
 * MapControls
 *
 * One grouped control stack floating over the map, replacing Leaflet's own
 * zoom control (disabled in the canvas) so the buttons are touch-sized,
 * keyboard reachable, and token-styled.
 *
 * Rendered as a sibling overlay rather than inside the Leaflet container, so
 * the buttons stay in normal React DOM and document focus order.
 */

import type { Map as LeafletMap } from "leaflet";
import {
  Crosshair,
  Frame,
  Layers,
  LocateFixed,
  Minus,
  Plus,
} from "lucide-react";
import type { GeolocationPermissionState } from "@/lib/hooks/useGeolocation";

export interface MapControlsProps {
  map: LeafletMap | null;
  /** Enables "fit route" only when there is geometry to frame. */
  canFitRoute: boolean;
  onFitRoute: () => void;
  onRecenterUser: () => void;
  hasUserLocation: boolean;
  isLocating: boolean;
  locationPermission: GeolocationPermissionState;
  onToggleLegend: () => void;
  isLegendOpen: boolean;
}

interface ControlButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pressed?: boolean;
  busy?: boolean;
  children: React.ReactNode;
}

function ControlButton({
  label,
  onPress,
  disabled,
  pressed,
  busy,
  children,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-busy={busy}
      disabled={disabled}
      onClick={onPress}
      className={`flex h-11 w-11 items-center justify-center text-foreground/80 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-40 ${
        pressed ? "bg-surface-selected text-state-selected" : ""
      }`}
    >
      {children}
    </button>
  );
}

export function MapControls({
  map,
  canFitRoute,
  onFitRoute,
  onRecenterUser,
  hasUserLocation,
  isLocating,
  locationPermission,
  onToggleLegend,
  isLegendOpen,
}: MapControlsProps) {
  const locationDenied = locationPermission === "denied";
  const locationUnsupported = locationPermission === "unsupported";

  const locationLabel = locationUnsupported
    ? "Location not supported by this browser"
    : locationDenied
      ? "Location permission denied"
      : hasUserLocation
        ? "Center on your location"
        : "Show your location";

  return (
    <div
      // Safe-area aware so the stack clears notches and the home indicator in
      // standalone PWA mode.
      className="pointer-events-none absolute right-0 top-0 z-[500] flex flex-col items-end gap-2 p-3 pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div
        role="group"
        aria-label="Map view controls"
        className="pointer-events-auto flex flex-col divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-strong bg-surface-floating"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <ControlButton
          label="Zoom in"
          onPress={() => map?.zoomIn()}
          disabled={!map}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </ControlButton>
        <ControlButton
          label="Zoom out"
          onPress={() => map?.zoomOut()}
          disabled={!map}
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </ControlButton>
      </div>

      <div
        role="group"
        aria-label="Map focus controls"
        className="pointer-events-auto flex flex-col divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-strong bg-surface-floating"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <ControlButton
          label="Fit route to view"
          onPress={onFitRoute}
          disabled={!map || !canFitRoute}
        >
          <Frame className="h-5 w-5" aria-hidden="true" />
        </ControlButton>
        <ControlButton
          label={locationLabel}
          onPress={onRecenterUser}
          disabled={!map || locationDenied || locationUnsupported}
          busy={isLocating}
        >
          {hasUserLocation ? (
            <LocateFixed className="h-5 w-5 text-state-selected" aria-hidden="true" />
          ) : (
            <Crosshair className="h-5 w-5" aria-hidden="true" />
          )}
        </ControlButton>
      </div>

      <div
        className="pointer-events-auto overflow-hidden rounded-lg border border-border-strong bg-surface-floating"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <ControlButton
          label="Map legend"
          onPress={onToggleLegend}
          pressed={isLegendOpen}
        >
          <Layers className="h-5 w-5" aria-hidden="true" />
        </ControlButton>
      </div>
    </div>
  );
}
