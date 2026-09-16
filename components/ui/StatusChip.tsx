"use client";

/**
 * StatusChip Component
 *
 * A small status pill that maps each semantic transit state to exactly one
 * Layer 2 semantic-state token (`--state-*`, exposed as `bg-state-*` Tailwind
 * utilities). The mapping is a total `Record<SemanticState, ...>` so TypeScript
 * enforces that every state is covered and none is left unmapped.
 *
 * This file is the canonical definition of `SemanticState`; other primitives
 * (e.g. MetricCard) import the type from here.
 *
 * Requirements: 7.1, 7.2, 5.6, 9.1
 */

import { Chip } from "@heroui/react";

/**
 * The finite set of semantic transit states. Each value maps to exactly one
 * `--state-*` design token.
 */
export type SemanticState =
  | "normal"
  | "advisory"
  | "delay"
  | "severe"
  | "unavailable"
  | "stale"
  | "selected";

export interface StatusChipProps {
  /** The semantic state this chip represents. */
  state: SemanticState;
  /** Visible label text. */
  label: string;
  /** Size variant. */
  size?: "sm" | "md";
}

/**
 * Total mapping from every `SemanticState` to its background token utility plus
 * the readable text color for that background.
 *
 * Background colors resolve from the `--state-*` tokens via the `bg-state-*`
 * utilities added in task 4.2. Saturated state hues (green/orange/red/blue) use
 * white text; the lighter yellow/neutral hues use near-black text for AA
 * contrast. Using `Record<SemanticState, ...>` makes the mapping exhaustive —
 * omitting any state is a compile-time error.
 */
const STATE_STYLES: Record<SemanticState, string> = {
  normal: "bg-state-normal text-white",
  advisory: "bg-state-advisory text-black",
  delay: "bg-state-delay text-white",
  severe: "bg-state-severe text-white",
  unavailable: "bg-state-unavailable text-black",
  stale: "bg-state-stale text-white",
  selected: "bg-state-selected text-white",
};

const SIZE_MAP = {
  sm: "sm",
  md: "md",
} as const;

export function StatusChip({ state, label, size = "md" }: StatusChipProps) {
  return (
    <Chip
      size={SIZE_MAP[size]}
      classNames={{
        base: STATE_STYLES[state],
        content: "font-medium",
      }}
    >
      {label}
    </Chip>
  );
}
