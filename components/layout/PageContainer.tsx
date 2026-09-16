import type { ReactNode } from "react";

/**
 * Maximum content width per `width` variant. `default` targets a comfortable
 * reading/app width, `wide` gives dashboards and multi-column grids more room,
 * and `full` opts out of the max-width constraint entirely.
 */
const widthClass: Record<NonNullable<PageContainerProps["width"]>, string> = {
  default: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

interface PageContainerProps {
  children: ReactNode;
  /** Max content width; defaults to the standard reading/app width. */
  width?: "default" | "wide" | "full";
  className?: string;
}

/**
 * Page-level content wrapper (Requirement 7.1, 7.2, 13.2).
 *
 * Applies the responsive page gutter, a max-width constraint per `width`, and
 * an `overflow-x` guard so long content (wide tables, charts, route lists)
 * scrolls within its own region instead of the page body. `min-w-0` on the
 * inner wrapper lets flex/grid children shrink instead of forcing horizontal
 * overflow.
 */
export function PageContainer({
  children,
  width = "default",
  className,
}: PageContainerProps) {
  return (
    <div
      className={[
        "mx-auto w-full px-page-gutter",
        "overflow-x-hidden",
        widthClass[width],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0">{children}</div>
    </div>
  );
}
