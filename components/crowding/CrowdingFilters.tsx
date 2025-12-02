"use client";

import { Button, Chip } from "@heroui/react";
import { Filter } from "lucide-react";
import type { TransitMode, Direction } from "@/types/mta";

interface CrowdingFiltersProps {
  mode: TransitMode;
  direction: Direction | "all";
  onModeChange: (mode: TransitMode) => void;
  onDirectionChange: (direction: Direction | "all") => void;
}

export function CrowdingFilters({
  mode,
  direction,
  onModeChange,
  onDirectionChange,
}: CrowdingFiltersProps) {
  const modes: TransitMode[] = ["subway", "bus", "lirr", "metro-north"];
  const directions: (Direction | "all")[] = ["all", "N", "S"];

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-foreground/50" />
        <span className="text-sm font-medium">Mode:</span>
        <div className="flex gap-2">
          {modes.map((m) => (
            <Chip
              key={m}
              variant={mode === m ? "solid" : "flat"}
              color={mode === m ? "primary" : "default"}
              onClick={() => onModeChange(m)}
              className="cursor-pointer"
            >
              {m === "metro-north" ? "Metro-North" : m.toUpperCase()}
            </Chip>
          ))}
        </div>
      </div>

      {/* Direction Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium ml-7">Direction:</span>
        <div className="flex gap-2">
          {directions.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={direction === d ? "solid" : "flat"}
              color={direction === d ? "primary" : "default"}
              onPress={() => onDirectionChange(d)}
            >
              {d === "all" ? "Both" : d === "N" ? "Northbound" : "Southbound"}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

