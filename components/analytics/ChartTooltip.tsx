import type { ReactNode } from "react";

interface ChartTooltipItem {
  label: string;
  value: ReactNode;
  unit?: string;
  color?: string;
}

interface ChartTooltipProps {
  label?: ReactNode;
  items: ChartTooltipItem[];
}

export function ChartTooltip({ label, items }: ChartTooltipProps) {
  return (
    <div
      className="min-w-36 rounded-md border border-border-strong bg-surface-floating px-3 py-2 text-sm"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      {label ? <p className="mb-1.5 font-semibold text-foreground">{label}</p> : null}
      <dl className="space-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-foreground/60">
              {item.color ? (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              ) : null}
              {item.label}
            </dt>
            <dd className="tabular font-semibold text-foreground">
              {item.value}
              {item.unit}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export type { ChartTooltipItem, ChartTooltipProps };
