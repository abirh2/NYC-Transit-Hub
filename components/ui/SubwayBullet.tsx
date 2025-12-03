"use client";

import Image from "next/image";
import { useState } from "react";

// Official MTA line colors for fallback
const lineColors: Record<string, { bg: string; text: string }> = {
  // IND Eighth Avenue Line (Blue)
  A: { bg: "#0039A6", text: "#fff" },
  C: { bg: "#0039A6", text: "#fff" },
  E: { bg: "#0039A6", text: "#fff" },
  // IND Sixth Avenue Line (Orange)
  B: { bg: "#FF6319", text: "#fff" },
  D: { bg: "#FF6319", text: "#fff" },
  F: { bg: "#FF6319", text: "#fff" },
  M: { bg: "#FF6319", text: "#fff" },
  // IND Crosstown Line (Lime Green)
  G: { bg: "#6CBE45", text: "#fff" },
  // BMT Canarsie Line (Gray)
  L: { bg: "#A7A9AC", text: "#fff" },
  // BMT Nassau Street Line (Brown)
  J: { bg: "#996633", text: "#fff" },
  Z: { bg: "#996633", text: "#fff" },
  // BMT Broadway Line (Yellow)
  N: { bg: "#FCCC0A", text: "#000" },
  Q: { bg: "#FCCC0A", text: "#000" },
  R: { bg: "#FCCC0A", text: "#000" },
  W: { bg: "#FCCC0A", text: "#000" },
  // IRT Broadway-Seventh Avenue Line (Red)
  "1": { bg: "#EE352E", text: "#fff" },
  "2": { bg: "#EE352E", text: "#fff" },
  "3": { bg: "#EE352E", text: "#fff" },
  // IRT Lexington Avenue Line (Green)
  "4": { bg: "#00933C", text: "#fff" },
  "5": { bg: "#00933C", text: "#fff" },
  "6": { bg: "#00933C", text: "#fff" },
  // IRT Flushing Line (Purple)
  "7": { bg: "#B933AD", text: "#fff" },
  "7X": { bg: "#B933AD", text: "#fff" }, // 7 Express
  // IRT Lexington Express variants
  "6X": { bg: "#00933C", text: "#fff" }, // 6 Express
  "5X": { bg: "#00933C", text: "#fff" }, // 5 Express
  // Shuttles (Gray)
  S: { bg: "#808183", text: "#fff" },
  GS: { bg: "#808183", text: "#fff" }, // Grand Central Shuttle
  FS: { bg: "#808183", text: "#fff" }, // Franklin Avenue Shuttle
  RS: { bg: "#808183", text: "#fff" }, // Rockaway Shuttle
  SR: { bg: "#808183", text: "#fff" }, // Rockaway Shuttle (alternate)
  // Staten Island Railway (Blue) - MTA uses both "SI" and "SIR"
  SI: { bg: "#0039A6", text: "#fff" },
  SIR: { bg: "#0039A6", text: "#fff" },
  // Second Avenue (future - Turquoise)
  T: { bg: "#00ADD0", text: "#fff" },
};

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
}

const sizeMap = {
  xs: { px: 16, text: "text-[9px]" },
  sm: { px: 20, text: "text-xs" },
  md: { px: 24, text: "text-sm" },
  lg: { px: 32, text: "text-base" },
};

export function SubwayBullet({ line, size = "md", className = "" }: SubwayBulletProps) {
  const [useIcon, setUseIcon] = useState(true);
  const { px, text } = sizeMap[size];
  const colors = lineColors[line.toUpperCase()] || { bg: "#808183", text: "#fff" };
  const iconFile = getIconFilename(line);

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
      }}
      aria-label={`${line} train`}
    >
      {line.toUpperCase()}
    </div>
  );

  if (!useIcon) {
    return fallback;
  }

  return (
    <div className={`relative ${className}`} style={{ width: px, height: px, minWidth: px, minHeight: px }}>
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

