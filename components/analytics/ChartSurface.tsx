import { useId, type ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";

interface ChartSurfaceProps {
  title: string;
  description?: string;
  action?: ReactNode;
  freshness?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartSurface({
  title,
  description,
  action,
  freshness,
  children,
  className,
}: ChartSurfaceProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={className}>
      <Surface className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <h2 id={headingId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-foreground/60">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {children}
        {freshness ? <div className="mt-3">{freshness}</div> : null}
      </Surface>
    </section>
  );
}

export type { ChartSurfaceProps };
