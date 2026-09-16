import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned controls (buttons, filters). */
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}

/**
 * Page title block (Requirement 7.1, 7.2, 6.1, 13.3).
 *
 * Renders a semantic `<header>` with an `<h1>` page title, optional
 * breadcrumb, description, and right-aligned actions. The title uses a
 * responsive size — smaller on mobile — so headings do not dominate small
 * viewports, and long titles wrap gracefully with `break-words`. Typography
 * comes from the Layer 2 `--text-page-title` / `--text-body-secondary` tokens.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <header className="mb-section flex flex-col gap-2">
      {breadcrumb ? <div className="min-w-0">{breadcrumb}</div> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold text-foreground sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p
              className="mt-1 text-sm text-foreground/70 sm:text-base"
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
    </header>
  );
}
