"use client";

/**
 * RailBadge Component
 * 
 * Displays a rail branch/line badge with appropriate color coding.
 * For LIRR and Metro-North.
 */

import { getRailBranchColor } from "@/lib/gtfs/rail-stations";
import type { TransitMode } from "@/types/mta";

interface RailBadgeProps {
  /** Branch/Line ID */
  branchId: string;
  /** Branch/Line name */
  branchName: string;
  /** Transit mode (lirr or metro-north) */
  mode: TransitMode;
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** Show full name or just abbreviation */
  abbreviated?: boolean;
}

const SIZE_CLASSES = {
  xs: "text-[9px] px-1.5 py-0.5",
  sm: "text-[10px] px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3 py-1",
};

/**
 * Get abbreviated name for rail line
 */
function getAbbreviation(name: string): string {
  // Common abbreviations
  const abbrevMap: Record<string, string> = {
    "Hudson": "HUD",
    "Harlem": "HAR",
    "New Haven": "NH",
    "New Canaan": "NC",
    "Danbury": "DAN",
    "Waterbury": "WAT",
    "Babylon": "BAB",
    "Far Rockaway": "FAR",
    "Hempstead": "HEM",
    "Long Beach": "LB",
    "Montauk": "MTK",
    "Oyster Bay": "OYB",
    "Port Jefferson": "PJ",
    "Port Washington": "PW",
    "Ronkonkoma": "RON",
    "West Hempstead": "WH",
    "Belmont Park": "BEL",
    "City Terminal Zone": "CTZ",
  };
  
  return abbrevMap[name] ?? name.substring(0, 3).toUpperCase();
}

export function RailBadge({
  branchId,
  branchName,
  mode,
  size = "md",
  abbreviated = false,
}: RailBadgeProps) {
  const backgroundColor = getRailBranchColor(branchId, mode);
  const displayText = abbreviated ? getAbbreviation(branchName) : branchName;
  
  // Determine text color based on background brightness
  const textColor = "#FFFFFF"; // Most rail colors work with white text

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-semibold rounded
        ${SIZE_CLASSES[size]}
        whitespace-nowrap
      `}
      style={{
        backgroundColor,
        color: textColor,
      }}
      title={`${branchName} ${mode === "lirr" ? "Branch" : "Line"}`}
    >
      {displayText}
    </span>
  );
}

