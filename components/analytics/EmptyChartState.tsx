import { BarChart3 } from "lucide-react";

interface EmptyChartStateProps {
  title?: string;
  description?: string;
}

export function EmptyChartState({
  title = "No chart data available",
  description = "Try another range or check back after more data is recorded.",
}: EmptyChartStateProps) {
  return (
    <div
      role="status"
      className="flex min-h-48 flex-col items-center justify-center gap-2 px-4 py-8 text-center"
    >
      <BarChart3 className="h-6 w-6 text-foreground/40" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="max-w-md text-sm text-foreground/60">{description}</p>
    </div>
  );
}

export type { EmptyChartStateProps };

