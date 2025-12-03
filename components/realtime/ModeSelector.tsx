"use client";

/**
 * ModeSelector Component
 * 
 * Tabs for switching between transit modes (Subway, Bus, LIRR, Metro-North).
 */

import { Tabs, Tab } from "@heroui/react";
import { Train, Bus, TrainFront } from "lucide-react";
import type { TransitMode } from "@/types/mta";

interface ModeSelectorProps {
  /** Currently selected mode */
  selectedMode: TransitMode;
  /** Callback when mode changes */
  onModeChange: (mode: TransitMode) => void;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Available modes (defaults to all) */
  availableModes?: TransitMode[];
}

const MODE_CONFIG: Record<TransitMode, { label: string; icon: typeof Train; shortLabel: string }> = {
  subway: { label: "Subway", shortLabel: "Subway", icon: Train },
  bus: { label: "Bus", shortLabel: "Bus", icon: Bus },
  lirr: { label: "LIRR", shortLabel: "LIRR", icon: TrainFront },
  "metro-north": { label: "Metro-North", shortLabel: "MNR", icon: TrainFront },
};

const DEFAULT_MODES: TransitMode[] = ["subway", "bus", "lirr", "metro-north"];

export function ModeSelector({
  selectedMode,
  onModeChange,
  compact = false,
  availableModes = DEFAULT_MODES,
}: ModeSelectorProps) {
  return (
    <Tabs
      aria-label="Transit mode selector"
      selectedKey={selectedMode}
      onSelectionChange={(key) => onModeChange(key as TransitMode)}
      size={compact ? "sm" : "md"}
      color="primary"
      variant="bordered"
      classNames={{
        tabList: "gap-1",
      }}
    >
      {availableModes.map((mode) => {
        const config = MODE_CONFIG[mode];
        const Icon = config.icon;
        
        return (
          <Tab
            key={mode}
            title={
              <div className="flex items-center gap-1.5">
                <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                <span className={compact ? "hidden sm:inline" : ""}>
                  {compact ? config.shortLabel : config.label}
                </span>
              </div>
            }
          />
        );
      })}
    </Tabs>
  );
}

