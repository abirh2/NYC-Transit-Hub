/**
 * Map marker visuals.
 *
 * These builders return plain HTML strings plus their pixel footprint; the map
 * canvas wraps them in `L.divIcon`. Keeping Leaflet out of this module means
 * the marker appearance (colors, contrast, direction, status) is pure and
 * unit-testable, and it keeps route color single-sourced through
 * `lib/transit/route-colors.ts` rather than a second hardcoded hex table.
 *
 * Structural styling lives in `.rt-marker*` rules in `app/globals.css` so both
 * themes work; only per-route color is inlined here.
 */

import { getRouteColorPair, pickContrastText } from "@/lib/transit/route-colors";

/**
 * Service/timing condition for a vehicle. Green, amber, and red are reserved
 * for these conditions only — direction is never encoded as a color.
 */
export type MarkerStatus = "normal" | "arriving" | "delay" | "severe" | "stale";

export interface MarkerVisual {
  html: string;
  /** `[width, height]` in px. */
  size: [number, number];
  /** Anchor offset from the top-left of `size`. */
  anchor: [number, number];
  /** Offset for an attached popup, relative to the anchor. */
  popupAnchor: [number, number];
}

/** Seconds of lateness before a vehicle is flagged, then flagged as severe. */
const DELAY_THRESHOLD_SECONDS = 120;
const SEVERE_DELAY_THRESHOLD_SECONDS = 600;

/**
 * Derives the marker status from realtime metadata.
 *
 * `isStale` wins over lateness: when we cannot trust the feed, reporting a
 * confident "6 min late" is worse than reporting staleness.
 */
export function getMarkerStatus(options: {
  minutesAway?: number | null;
  delaySeconds?: number | null;
  isStale?: boolean;
}): MarkerStatus {
  if (options.isStale) return "stale";

  const delay = options.delaySeconds ?? 0;
  if (delay >= SEVERE_DELAY_THRESHOLD_SECONDS) return "severe";
  if (delay >= DELAY_THRESHOLD_SECONDS) return "delay";

  const minutes = options.minutesAway;
  if (minutes !== null && minutes !== undefined && minutes <= 1) {
    return "arriving";
  }

  return "normal";
}

/**
 * Initial bearing in degrees (0 = north, clockwise) from one point to another.
 *
 * Used only to orient the direction chevron on a marker, so the great-circle
 * initial bearing is more than accurate enough at city scale.
 */
export function getBearingDegrees(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const deltaLon = toRad(toLon - fromLon);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/** Escapes text interpolated into marker HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusClass(status: MarkerStatus): string {
  return status === "normal" ? "" : ` rt-marker--${status}`;
}

/**
 * Small condition indicator, colored by `.rt-marker--*` in `globals.css`.
 * Absent when there is nothing to report, so an on-time marker stays minimal.
 */
function statusBadge(status: MarkerStatus): string {
  return status === "normal"
    ? ""
    : `<span class="rt-marker__status" aria-hidden="true"></span>`;
}

// Marker footprint math. Leaflet needs an explicit `iconSize`, so the builders
// measure their own parts rather than assuming a fixed box — otherwise a
// marker carrying both a chevron and a status dot overflows its icon and
// collides with its neighbours.
const MARKER_CHROME_WIDTH = 6; // horizontal padding (4) + border (2)
const MARKER_HEIGHT = 32;
const BULLET_SIZE = 26;
const GLYPH_SIZE = 22;
const CHEVRON_WIDTH = 12; // glyph (10) + gap (2)
const STATUS_WIDTH = 9; // dot (7) + gap (2)
const LABEL_CHAR_WIDTH = 7.5;

function extrasWidth(
  bearingDegrees: number | null,
  status: MarkerStatus,
): number {
  return (
    (bearingDegrees === null ? 0 : CHEVRON_WIDTH) +
    (status === "normal" ? 0 : STATUS_WIDTH)
  );
}

function sizeFor(contentWidth: number): Pick<MarkerVisual, "size" | "anchor" | "popupAnchor"> {
  const width = Math.ceil(contentWidth + MARKER_CHROME_WIDTH);
  return {
    size: [width, MARKER_HEIGHT],
    anchor: [Math.round(width / 2), MARKER_HEIGHT / 2],
    popupAnchor: [0, -MARKER_HEIGHT / 2],
  };
}

/**
 * Direction chevron, rotated to point along the vehicle's travel bearing.
 *
 * Orientation (not color) carries direction, so the same green/amber/red
 * vocabulary stays available for service condition.
 */
function directionChevron(bearingDegrees: number | null): string {
  if (bearingDegrees === null) return "";
  const rotation = Math.round(((bearingDegrees % 360) + 360) % 360);
  return (
    `<span class="rt-marker__chevron" aria-hidden="true" ` +
    `style="transform: rotate(${rotation}deg)">` +
    `<svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor">` +
    `<path d="M5 0 L9.5 9 L5 6.8 L0.5 9 Z" />` +
    `</svg></span>`
  );
}

export interface SubwayMarkerOptions {
  routeId: string;
  /** Human-readable direction, e.g. "Northbound". Announced, never colored. */
  directionLabel: string;
  /** Travel bearing in degrees, or `null` when it cannot be derived. */
  bearingDegrees: number | null;
  status: MarkerStatus;
  isSelected: boolean;
  /** Announced alongside the route so color is never the only route cue. */
  accessibleSuffix?: string;
}

/**
 * Subway train marker: the route bullet dominates, with direction carried by
 * an oriented chevron and condition by a small badge.
 */
export function buildSubwayMarkerHtml(options: SubwayMarkerOptions): MarkerVisual {
  const { bg, text } = getRouteColorPair(options.routeId);
  const label = escapeHtml(options.routeId);
  const selected = options.isSelected ? " rt-marker--selected" : "";

  const srText = escapeHtml(
    [
      `${options.routeId} train`,
      options.directionLabel,
      options.accessibleSuffix,
    ]
      .filter(Boolean)
      .join(", "),
  );

  const html =
    `<div class="rt-marker rt-marker--subway${selected}${statusClass(options.status)}">` +
    `<span class="rt-marker__bullet" style="background:${bg};color:${text}" aria-hidden="true">${label}</span>` +
    directionChevron(options.bearingDegrees) +
    statusBadge(options.status) +
    `<span class="rt-marker__sr">${srText}</span>` +
    `</div>`;

  return {
    html,
    ...sizeFor(
      BULLET_SIZE + extrasWidth(options.bearingDegrees, options.status),
    ),
  };
}

export interface RailMarkerOptions {
  /** Train number when the feed supplies one. */
  trainId: string | null;
  routeColor: string;
  directionLabel: string;
  bearingDegrees: number | null;
  status: MarkerStatus;
  isSelected: boolean;
  accessibleSuffix?: string;
}

const RAIL_GLYPH =
  `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" ` +
  `stroke="currentColor" stroke-width="2" stroke-linecap="round">` +
  `<path d="M4 11V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4" />` +
  `<path d="M4 15v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />` +
  `<path d="M4 11h16v4H4z" />` +
  `</svg>`;

/** Commuter-rail marker: branch color plus the train number riders quote. */
export function buildRailMarkerHtml(options: RailMarkerOptions): MarkerVisual {
  const text = pickContrastText(options.routeColor);
  const label =
    options.trainId && options.trainId !== "---" ? options.trainId : null;
  const selected = options.isSelected ? " rt-marker--selected" : "";

  const srText = escapeHtml(
    [
      label ? `Train ${label}` : "Train",
      options.directionLabel,
      options.accessibleSuffix,
    ]
      .filter(Boolean)
      .join(", "),
  );

  const html =
    `<div class="rt-marker rt-marker--rail${selected}${statusClass(options.status)}">` +
    `<span class="rt-marker__glyph" style="background:${options.routeColor};color:${text}" aria-hidden="true">${RAIL_GLYPH}</span>` +
    (label
      ? `<span class="rt-marker__label" aria-hidden="true">${escapeHtml(label)}</span>`
      : "") +
    directionChevron(options.bearingDegrees) +
    statusBadge(options.status) +
    `<span class="rt-marker__sr">${srText}</span>` +
    `</div>`;

  return {
    html,
    ...sizeFor(
      GLYPH_SIZE +
        (label ? label.length * LABEL_CHAR_WIDTH + 2 : 0) +
        extrasWidth(options.bearingDegrees, options.status),
    ),
  };
}

export interface BusMarkerOptions {
  routeId: string;
  routeColor: string;
  /** Reported GPS bearing, or `null` when the feed omits it. */
  bearingDegrees: number | null;
  status: MarkerStatus;
  isSelected: boolean;
  accessibleSuffix?: string;
}

/**
 * Bus marker.
 *
 * Deliberately a different silhouette from the subway bullet: buses report an
 * actual GPS fix, so the marker reads as a located vehicle (squared puck,
 * continuously rotated heading) rather than an inferred position on a line.
 */
export function buildBusMarkerHtml(options: BusMarkerOptions): MarkerVisual {
  const text = pickContrastText(options.routeColor);
  const label = escapeHtml(options.routeId);
  const selected = options.isSelected ? " rt-marker--selected" : "";

  const srText = escapeHtml(
    [
      `${options.routeId} bus`,
      options.bearingDegrees === null
        ? "heading unavailable"
        : `heading ${compassPoint(options.bearingDegrees)}`,
      options.accessibleSuffix,
    ]
      .filter(Boolean)
      .join(", "),
  );

  const html =
    `<div class="rt-marker rt-marker--bus${selected}${statusClass(options.status)}">` +
    `<span class="rt-marker__puck" style="background:${options.routeColor};color:${text}" aria-hidden="true">${label}</span>` +
    directionChevron(options.bearingDegrees) +
    statusBadge(options.status) +
    `<span class="rt-marker__sr">${srText}</span>` +
    `</div>`;

  return {
    html,
    ...sizeFor(
      // Puck is `min-width: 22px` with 5px of padding either side.
      Math.max(GLYPH_SIZE, 10 + label.length * LABEL_CHAR_WIDTH) +
        extrasWidth(options.bearingDegrees, options.status),
    ),
  };
}

const COMPASS_POINTS = [
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
] as const;

/** Converts a bearing into a spoken compass point for screen readers. */
export function compassPoint(bearingDegrees: number): string {
  const normalized = ((bearingDegrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % COMPASS_POINTS.length;
  return COMPASS_POINTS[index];
}

/** User-location marker: the familiar pulsing blue dot. */
export function buildUserLocationHtml(): MarkerVisual {
  return {
    html:
      `<div class="rt-user-location">` +
      `<span class="rt-user-location__pulse" aria-hidden="true"></span>` +
      `<span class="rt-user-location__dot" aria-hidden="true"></span>` +
      `<span class="rt-marker__sr">Your location</span>` +
      `</div>`,
    size: [22, 22],
    anchor: [11, 11],
    popupAnchor: [0, -12],
  };
}
