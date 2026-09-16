import type { CSSProperties, ReactNode } from "react";

interface FloatingSurfaceProps {
  children: ReactNode;
  className?: string;
}

/**
 * FloatingSurface is the highest-elevation overlay primitive for map/control
 * surfaces that float above page content. It uses `--surface-floating` with
 * `--shadow-lg` and is safe-area aware: it pads with the device safe-area
 * insets (`env(safe-area-inset-*)`) so overlays clear notches, rounded
 * corners, and the home indicator on mobile/standalone PWAs.
 */
const FLOATING_STYLE: CSSProperties = {
  boxShadow: "var(--shadow-lg)",
  paddingTop: "env(safe-area-inset-top, 0px)",
  paddingRight: "env(safe-area-inset-right, 0px)",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  paddingLeft: "env(safe-area-inset-left, 0px)",
};

export function FloatingSurface({ children, className }: FloatingSurfaceProps) {
  return (
    <div
      className={`rounded-lg border border-border-strong bg-surface-floating${
        className ? ` ${className}` : ""
      }`}
      style={FLOATING_STYLE}
    >
      {children}
    </div>
  );
}

export type { FloatingSurfaceProps };
