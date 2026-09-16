"use client";

import Image from "next/image";
import { useState } from "react";
import { getRouteColorPair } from "@/lib/transit/route-colors";

// Map line names to SVG filenames (lowercase)
// Handles express variants, shuttles, and aliases
function getIconFilename(line: string): string {
  const normalized = line.toUpperCase();
  
  // Express variants use diamond icons
  if (normalized === "7X") return "7d";  // 7 Express
  if (normalized === "6X") return "6d";  // 6 Express (Pelham Express)
  if (normalized === "5X") return "5";   // 5 Express (no special icon)
  
  // Shuttle mappings
  if (normalized === "GS") return "s";   // Grand Central Shuttle (42nd St)
  if (normalized === "FS") return "sf";  // Franklin Avenue Shuttle
  if (normalized === "RS" || normalized === "SR") return "sr"; // Rockaway Shuttle
  
  // Staten Island Railway
  if (normalized === "SI" || normalized === "SIR") return "sir";
  
  return line.toLowerCase();
}

interface SubwayBulletProps {
  line: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  /**
   * When true, render a selected treatment: a contrast-aware ring derived from
   * the route color pair in `route-colors.ts`, so the emphasis matches the
   * bullet's own palette instead of a fixed accent.
   */
  selected?: boolean;
}

const sizeMap = {
  xs: { px: 16, text: "text-[9px]" },
  sm: { px: 20, text: "text-xs" },
  md: { px: 24, text: "text-sm" },
  lg: { px: 32, text: "text-base" },
};

export function SubwayBullet({ line, size = "md", className = "", selected = false }: SubwayBulletProps) {
  const [useIcon, setUseIcon] = useState(true);
  const { px, text } = sizeMap[size];
  const colors = getRouteColorPair(line);
  const iconFile = getIconFilename(line);

  // Selected treatment: an outer ring whose color/contrast derive from the
  // route color pair (bright routes get a dark ring, dark routes a light ring),
  // plus a subtle surface-selected halo so selection reads in any theme.
  const selectedRing = selected
    ? {
        boxShadow: `0 0 0 2px var(--surface-app), 0 0 0 4px ${colors.text === "#000000" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)"}`,
        borderRadius: "9999px",
      }
    : undefined;

  // Fallback colored circle
  const fallback = (
    <div
      className={`flex items-center justify-center rounded-full font-bold ${text} ${className}`}
      style={{
        width: px,
        height: px,
        backgroundColor: colors.bg,
        color: colors.text,
        minWidth: px,
        minHeight: px,
        ...selectedRing,
      }}
      aria-label={`${line} train`}
      aria-pressed={selected || undefined}
    >
      {line.toUpperCase()}
    </div>
  );

  if (!useIcon) {
    return fallback;
  }

  return (
    <div
      className={`relative ${className}`}
      style={{ width: px, height: px, minWidth: px, minHeight: px, ...selectedRing }}
      aria-pressed={selected || undefined}
    >
      <Image
        src={`/icons/subway/${iconFile}.svg`}
        alt={`${line} train`}
        width={px}
        height={px}
        onError={() => setUseIcon(false)}
        className="object-contain"
      />
    </div>
  );
}

