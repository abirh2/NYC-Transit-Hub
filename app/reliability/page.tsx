import { TrendingUp } from "lucide-react";
import { PlaceholderCard } from "@/components/ui";

export const metadata = {
  title: "Reliability",
  description: "Track on-time performance and delays by subway line",
};

export default function ReliabilityPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Line Reliability
        </h1>
        <p className="mt-1 text-foreground/70">
          Track on-time performance and historical delay data
        </p>
      </div>

      {/* Placeholder Content */}
      <PlaceholderCard
        icon={<TrendingUp className="h-5 w-5" />}
        title="Coming Soon"
        phase="Phase 3"
        description="This page will display reliability metrics for each subway line, including on-time rates, average delays, and performance grades. You'll be able to view trends over time with interactive charts."
      >
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["A", "C", "E", "F", "G", "L"].map((line) => (
            <div
              key={line}
              className="rounded-lg border border-dashed border-divider p-4 text-center"
            >
              <p className="text-lg font-bold text-foreground">{line}</p>
              <p className="text-sm text-foreground/50">--% on-time</p>
            </div>
          ))}
        </div>
      </PlaceholderCard>
    </div>
  );
}
