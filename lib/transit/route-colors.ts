/**
 * Route color single source of truth.
 *
 * This module is the authoritative source of canonical MTA subway route-family
 * colors and the contrast rule used to pick readable text over any route color.
 *
 * It is intentionally framework-free:
 * - No React imports.
 * - No top-level `data/gtfs` JSON import.
 *
 * Because of that, it is safe to import from both server/data code
 * (`lib/gtfs/*`) and client components (`components/*`) without pulling in
 * client-only code or large data files at module load.
 *
 * Requirements: 8.1, 8.3, 8.4, 5.7, 5.9
 */

/** Neutral gray fallback used when a route family is unknown. */
const FALLBACK_COLOR = "#808183"; // matches --mta-gray

/**
 * Canonical subway route-family hex colors, keyed by normalized line id.
 *
 * These are the single canonical hex set. Drift between prior duplicated
 * definitions has been reconciled to one agreed value per family:
 * - `L` -> `#A7A9AC` (BMT Canarsie gray; the accurate MTA value, chosen over
 *   the generic `#808183`/"gray" that had drifted in elsewhere).
 * - `G` -> `#6CBE45` (IND Crosstown lime; matches the `--mta-turquoise` palette
 *   var, chosen over any generic gray).
 *
 * Values are keyed by normalized (see `normalizeLine`) line id. Only the base
 * family ids are stored here; express, SIR/SI, and shuttle variants normalize
 * onto these keys.
 */
export const SUBWAY_ROUTE_COLORS: Record<string, string> = {
  // IRT Broadway–Seventh Avenue Line (Red)
  "1": "#EE352E",
  "2": "#EE352E",
  "3": "#EE352E",
  // IRT Lexington Avenue Line (Green)
  "4": "#00933C",
  "5": "#00933C",
  "6": "#00933C",
  // IRT Flushing Line (Purple)
  "7": "#B933AD",
  // IND Eighth Avenue Line (Blue)
  A: "#0039A6",
  C: "#0039A6",
  E: "#0039A6",
  // IND Sixth Avenue Line (Orange)
  B: "#FF6319",
  D: "#FF6319",
  F: "#FF6319",
  M: "#FF6319",
  // IND Crosstown Line (Lime Green)
  G: "#6CBE45",
  // BMT Nassau Street Line (Brown)
  J: "#996633",
  Z: "#996633",
  // BMT Canarsie Line (Gray)
  L: "#A7A9AC",
  // BMT Broadway Line (Yellow)
  N: "#FCCC0A",
  Q: "#FCCC0A",
  R: "#FCCC0A",
  W: "#FCCC0A",
  // Shuttles (Dark Gray)
  S: "#808183",
  // Staten Island Railway (Blue)
  SIR: "#0039A6",
  // Second Avenue Subway (future - Turquoise)
  T: "#00ADD0",
};

/** Bullet descriptor for the Route_Bullet primitive. */
export interface RouteColorPair {
  bg: string;
  text: string;
}

/**
 * Normalize a raw line id onto a canonical key in `SUBWAY_ROUTE_COLORS`.
 *
 * Handles:
 * - case (`a` -> `A`) and surrounding whitespace
 * - express variants (`6X`, `7X`, `5X`, `<6>` style suffixes) -> base line
 * - SIR / SI (Staten Island Railway) -> `SIR`
 * - shuttles (`GS`, `FS`, `RS`, `SR`, `SS`) -> `S`
 */
function normalizeLine(line: string): string {
  const normalized = (line ?? "").trim().toUpperCase();

  if (normalized === "") return "";

  // Staten Island Railway aliases.
  if (normalized === "SI" || normalized === "SIR") return "SIR";

  // Shuttles all resolve to the gray shuttle family.
  if (
    normalized === "GS" ||
    normalized === "FS" ||
    normalized === "RS" ||
    normalized === "SR" ||
    normalized === "SS"
  ) {
    return "S";
  }

  // Express variants: a trailing "X" or a numeric line wrapped in diamond
  // markers (e.g. "<6>") maps to the base line.
  const expressMatch = normalized.match(/^<?([1-9])>?X?$/);
  if (expressMatch) return expressMatch[1];

  return normalized;
}

/**
 * WCAG relative-luminance contrast helper used to pick text color.
 *
 * Returns black or white, whichever has the higher contrast ratio against the
 * supplied background, so route bullets meet WCAG AA without a hand-maintained
 * per-line text color table.
 */
export function pickContrastText(hexBackground: string): "#000000" | "#ffffff" {
  const rgb = hexToRgb(hexBackground);
  if (!rgb) return "#000000";

  const bgLuminance = relativeLuminance(rgb);

  // Contrast ratio against white (luminance 1) and black (luminance 0).
  const contrastWithWhite = 1.05 / (bgLuminance + 0.05);
  const contrastWithBlack = (bgLuminance + 0.05) / 0.05;

  return contrastWithBlack >= contrastWithWhite ? "#000000" : "#ffffff";
}

/**
 * Canonical foreground/text hex for a given background color (contrast-safe).
 *
 * Alias of `pickContrastText` in a name that reads naturally at call sites that
 * already hold a background hex.
 */
export function getRouteTextColor(hexBackground: string): string {
  return pickContrastText(hexBackground);
}

/**
 * Look up a subway route-family color by line id.
 *
 * Normalizes case, express, SIR/SI, and shuttle variants, and falls back to a
 * neutral gray when the line id is unknown.
 */
export function getSubwayRouteColor(line: string): string {
  const key = normalizeLine(line);
  return SUBWAY_ROUTE_COLORS[key] ?? FALLBACK_COLOR;
}

/**
 * Resolve the `{ bg, text }` descriptor for the Route_Bullet primitive.
 *
 * The text color is always derived from the background via `pickContrastText`,
 * so contrast is single-sourced rather than maintained per line.
 */
export function getRouteColorPair(line: string): RouteColorPair {
  const bg = getSubwayRouteColor(line);
  return { bg, text: pickContrastText(bg) };
}

// ---------------------------------------------------------------------------
// Internal color math (WCAG 2.1 relative luminance)
// ---------------------------------------------------------------------------

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse a `#rrggbb` (or `#rgb`) hex string into 0–255 channel values. */
function hexToRgb(hex: string): Rgb | null {
  if (typeof hex !== "string") return null;

  let value = hex.trim().replace(/^#/, "");

  // Expand shorthand (e.g. "abc" -> "aabbcc").
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/** Compute WCAG 2.1 relative luminance (0–1) for an sRGB color. */
function relativeLuminance({ r, g, b }: Rgb): number {
  const [rl, gl, bl] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}
