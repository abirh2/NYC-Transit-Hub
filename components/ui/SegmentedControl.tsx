"use client";

/**
 * SegmentedControl
 *
 * A generic, accessible segmented (single-select) control. Renders as a
 * `role="radiogroup"` whose options are `role="radio"` buttons, with a roving
 * tabindex and full arrow-key navigation (Left/Right/Up/Down + Home/End) per
 * the WAI-ARIA radio-group pattern.
 *
 * Consumes Layer 2 design tokens (surface, radii, border, focus) so it matches
 * the rest of the design system in both themes.
 *
 * Requirements: 7.1, 7.2, 14.2, 14.3
 */

import { useCallback, useId, useRef } from "react";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Required: a radiogroup must be labelled. */
  ariaLabel: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = options.findIndex((o) => o.value === value);
  // Roving tabindex anchor: the selected option, or the first when none match.
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const focusAndSelect = useCallback(
    (index: number) => {
      const count = options.length;
      if (count === 0) return;
      const wrapped = ((index % count) + count) % count;
      const option = options[wrapped];
      onChange(option.value);
      optionRefs.current[wrapped]?.focus();
    },
    [options, onChange],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          focusAndSelect(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          focusAndSelect(index - 1);
          break;
        case "Home":
          event.preventDefault();
          focusAndSelect(0);
          break;
        case "End":
          event.preventDefault();
          focusAndSelect(options.length - 1);
          break;
        default:
          break;
      }
    },
    [focusAndSelect, options.length],
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-panel p-1 ${className}`}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              optionRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            id={`${groupId}-${option.value}`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-body-secondary font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel ${
              isSelected
                ? "bg-surface-selected text-foreground"
                : "text-foreground/70 hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {option.icon != null && (
              <span aria-hidden="true" className="inline-flex items-center">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
