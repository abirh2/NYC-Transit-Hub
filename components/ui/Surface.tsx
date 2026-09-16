import type { CSSProperties, ElementType, ReactNode } from "react";

/**
 * Elevation levels consume Layer 2 surface + depth tokens. The elevation
 * hierarchy is app < panel < elevated < floating (see `app/globals.css`).
 *
 * - `panel`: base container surface with a subtle border, no shadow.
 * - `elevated`: raised surface with `--shadow-md`.
 * - `floating`: highest surface (overlays/controls) with `--shadow-lg`.
 */
type SurfaceElevation = "panel" | "elevated" | "floating";

interface SurfaceProps {
  children: ReactNode;
  elevation?: SurfaceElevation;
  /** Semantic element to render. Defaults to `div`; use `section`/`article`/`aside` for semantic HTML. */
  as?: ElementType;
  className?: string;
}

const ELEVATION_CLASSNAMES: Record<SurfaceElevation, string> = {
  panel: "bg-surface-panel border border-border-subtle",
  elevated: "bg-surface-elevated border border-border-subtle",
  floating: "bg-surface-floating border border-border-strong",
};

/**
 * Shadow tokens are CSS variables (`--shadow-md`/`--shadow-lg`) rather than
 * Tailwind shadow utilities, so they are applied via inline style. `panel`
 * has no shadow.
 */
const ELEVATION_SHADOW: Record<SurfaceElevation, CSSProperties> = {
  panel: {},
  elevated: { boxShadow: "var(--shadow-md)" },
  floating: { boxShadow: "var(--shadow-lg)" },
};

/**
 * Surface (a.k.a. Panel) is the shared container primitive. It renders a
 * token-backed surface at one of three elevations and is polymorphic via the
 * `as` prop so callers can render semantic HTML (`section`/`article`/`aside`).
 */
export function Surface({
  children,
  elevation = "panel",
  as,
  className,
}: SurfaceProps) {
  const Component = as ?? "div";

  return (
    <Component
      className={`rounded-lg ${ELEVATION_CLASSNAMES[elevation]}${
        className ? ` ${className}` : ""
      }`}
      style={ELEVATION_SHADOW[elevation]}
    >
      {children}
    </Component>
  );
}

export type { SurfaceProps, SurfaceElevation };
