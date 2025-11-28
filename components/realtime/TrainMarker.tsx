"use client";

/**
 * TrainMarker Component
 * 
 * Displays a single train on the line diagram.
 * Shows line bullet, direction arrow, and "NOW" indicator if arriving.
 */

import { SubwayBullet } from "@/components/ui";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { TrainArrival } from "@/types/mta";

interface TrainMarkerProps {
  train: TrainArrival;
  isSelected?: boolean;
  onClick?: (train: TrainArrival) => void;
  size?: "sm" | "md";
}

export function TrainMarker({
  train,
  isSelected = false,
  onClick,
  size = "md",
}: TrainMarkerProps) {
  const isNorthbound = train.direction === "N";

  return (
    <button
      onClick={() => onClick?.(train)}
      className={`
        flex items-center gap-1 px-1 py-0.5 rounded-full
        transition-all duration-300 ease-out
        ${isSelected 
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" 
          : "hover:scale-105"
        }
        ${size === "sm" ? "scale-90" : ""}
        bg-background shadow-md border border-divider
        cursor-pointer
      `}
      title={`${train.routeId} train to ${train.headsign || (isNorthbound ? "Uptown" : "Downtown")}`}
    >
      <SubwayBullet line={train.routeId} size="sm" />
      <div className={`
        flex items-center justify-center
        ${isNorthbound ? "text-success" : "text-danger"}
      `}>
        {isNorthbound ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )}
      </div>
      {train.minutesAway <= 1 && (
        <span className="text-[10px] font-bold text-success animate-pulse">
          NOW
        </span>
      )}
    </button>
  );
}
