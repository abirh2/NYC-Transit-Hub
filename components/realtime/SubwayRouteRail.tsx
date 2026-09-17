"use client";

/**
 * SubwayRouteRail
 *
 * Single-select subway route picker built for fast scanning: every line is
 * visible as its real bullet in one horizontally scrollable rail, so choosing
 * a route is one tap instead of opening a popover and hunting through groups.
 *
 * Lines are ordered by color family (using the same `LINE_GROUPS` the previous
 * popover used), which keeps the trunk lines adjacent and makes the rail
 * scannable at a glance rather than alphabetical.
 *
 * Keyboard: a `radiogroup` with a roving tabindex and arrow/Home/End support,
 * matching `SegmentedControl` so both controls in the toolbar behave the same.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { SubwayBullet } from "@/components/ui";
import { LINE_GROUPS, type LineId } from "@/lib/gtfs/line-stations";

export interface SubwayRouteRailProps {
  selectedLine: string | null;
  onSelect: (line: LineId | null) => void;
}

export function SubwayRouteRail({
  selectedLine,
  onSelect,
}: SubwayRouteRailProps) {
  const lines = useMemo(
    () =>
      Object.values(LINE_GROUPS).flatMap(
        (group) => group.lines as readonly LineId[],
      ),
    [],
  );

  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = lines.findIndex((line) => line === selectedLine);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const focusAt = useCallback(
    (index: number) => {
      const count = lines.length;
      if (count === 0) return;
      const wrapped = ((index % count) + count) % count;
      optionRefs.current[wrapped]?.focus();
      onSelect(lines[wrapped]);
    },
    [lines, onSelect],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          focusAt(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          focusAt(index - 1);
          break;
        case "Home":
          event.preventDefault();
          focusAt(0);
          break;
        case "End":
          event.preventDefault();
          focusAt(lines.length - 1);
          break;
        default:
          break;
      }
    },
    [focusAt, lines.length],
  );

  /** Keep a deep-linked route visible without yanking focus. */
  useEffect(() => {
    if (selectedIndex < 0) return;
    optionRefs.current[selectedIndex]?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [selectedIndex]);

  return (
    <div
      role="radiogroup"
      aria-label="Select a subway route"
      // `overscroll-x-contain` stops a horizontal flick from triggering the
      // browser's back gesture on iOS.
      className="-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {lines.map((line, index) => {
        const isSelected = line === selectedLine;
        return (
          <button
            key={line}
            ref={(el) => {
              optionRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            // The line id is announced as text, so route identity never
            // depends on color alone.
            aria-label={`${line} train`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => onSelect(isSelected ? null : line)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel ${
              isSelected
                ? "border-state-selected bg-surface-selected"
                : "border-transparent hover:bg-surface-hover"
            }`}
          >
            <SubwayBullet line={line} size="md" />
          </button>
        );
      })}
    </div>
  );
}
