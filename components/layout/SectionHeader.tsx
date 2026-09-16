import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned controls (buttons, filters). */
  actions?: ReactNode;
}

/**
 * Section title block (Requirement 7.1, 7.2, 6.1).
 *
 * Renders an `<h2>` section title with optional description and right-aligned
 * actions, sitting below a `PageHeader` to divide a page into labeled sections.
 * Typography comes from the Layer 2 `--text-section-title` /
 * `--text-body-secondary` tokens.
 */
export function SectionHeader({
  title,
  description,
  actions,
}: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h2
          className="break-words text-lg font-semibold text-foreground"
          style={{ font: "var(--text-section-title)" }}
        >
          {title}
        </h2>
        {description ? (
          <p
            className="mt-1 text-sm text-foreground/70"
            style={{ font: "var(--text-body-secondary)" }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
