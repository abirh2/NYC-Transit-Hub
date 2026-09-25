"use client";

/**
 * ModeSelector Component
 *
 * Transit-mode switch (Subway, Bus, LIRR, Metro-North) built on the shared
 * `SegmentedControl` primitive, so it carries the design-system tokens and the
 * WAI-ARIA radio-group keyboard behavior instead of a bespoke tab list.
 */

import { Bus, Train, TrainFront } from "lucide-react";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui";
import type { TransitMode } from "@/types/mta";

interface ModeSelectorProps {
  /** Currently selected mode */
  selectedMode: TransitMode;
  /** Callback when mode changes */
  onModeChange: (mode: TransitMode) => void;
  /** Compact mode drops labels to icons-only on narrow viewports */
  compact?: boolean;
  /** Available modes (defaults to all) */
  availableModes?: TransitMode[];
  className?: string;
}

const MODE_CONFIG: Record<
  TransitMode,
  { label: string; shortLabel: string; icon: typeof Train }
> = {
  subway: { label: "Subway", shortLabel: "Sub", icon: Train },
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
  className,
}: ModeSelectorProps) {
  const resolvedClassName = [
    compact ? "max-w-full [&>button]:px-1.5" : "",
    className ?? "",
  ].filter(Boolean).join(" ");
  const options: SegmentedControlOption<TransitMode>[] = availableModes.map(
    (mode) => {
      const config = MODE_CONFIG[mode];
      const Icon = config.icon;
      return {
        value: mode,
        label: compact ? config.shortLabel : config.label,
        ariaLabel: config.label,
        icon: <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      };
    },
  );

  return (
    <SegmentedControl
      options={options}
      value={selectedMode}
      onChange={onModeChange}
      ariaLabel="Transit mode"
      className={resolvedClassName}
    />
  );
}
