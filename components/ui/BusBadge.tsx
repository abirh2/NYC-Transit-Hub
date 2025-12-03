"use client";

/**
 * BusBadge Component
 * 
 * Displays a bus route badge with appropriate color coding.
 * Similar to SubwayBullet but for bus routes.
 */

import { getBusRouteColor, getBusRouteTextColor, isSelectBusService, isExpressRoute } from "@/lib/gtfs/bus-routes";

interface BusBadgeProps {
  /** Bus route ID (e.g., "M15", "B44+", "BXM1") */
  route: string;
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** Show full route ID or abbreviated */
  abbreviated?: boolean;
}

const SIZE_CLASSES = {
  xs: "text-[9px] px-1 py-0.5 min-w-[24px]",
  sm: "text-[10px] px-1.5 py-0.5 min-w-[28px]",
  md: "text-xs px-2 py-1 min-w-[32px]",
  lg: "text-sm px-2.5 py-1 min-w-[40px]",
};

export function BusBadge({
  route,
  size = "md",
  abbreviated = false,
}: BusBadgeProps) {
  const backgroundColor = getBusRouteColor(route);
  const textColor = getBusRouteTextColor(route);
  const isSbs = isSelectBusService(route);
  const isExpress = isExpressRoute(route);
  
  // Display text - optionally abbreviate long routes
  let displayText = route;
  if (abbreviated && route.length > 4) {
    // Keep route number, abbreviate prefix for express
    displayText = route.replace(/^(BXM|SIM|QM|BM)/, (match) => {
      switch (match) {
        case "BXM": return "Bx";
        case "SIM": return "SI";
        case "QM": return "Q";
        case "BM": return "B";
        default: return match;
      }
    });
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-bold rounded
        ${SIZE_CLASSES[size]}
        ${isSbs ? "ring-1 ring-white/30" : ""}
        ${isExpress ? "italic" : ""}
      `}
      style={{
        backgroundColor,
        color: textColor,
      }}
      title={`${route}${isSbs ? " (Select Bus Service)" : ""}${isExpress ? " (Express)" : ""}`}
    >
      {displayText}
    </span>
  );
}

