import { AlertTriangle } from "lucide-react";
import { PlaceholderCard } from "@/components/ui";

export const metadata = {
  title: "Incidents",
  description: "Browse service alerts and disruption history",
};

export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Incident Explorer
        </h1>
        <p className="mt-1 text-foreground/70">
          Browse service alerts and disruption history
        </p>
      </div>

      {/* Placeholder Content */}
      <PlaceholderCard
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Coming Soon"
        phase="Phase 3"
        description="This page will display a timeline of service disruptions with filtering by line, date range, and incident type. You'll be able to see which lines are most affected and common incident patterns."
      >
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-dashed border-divider p-4">
            <div className="flex items-center justify-between">
              <p className="text-foreground/50">Active alerts</p>
              <span className="text-lg font-bold text-foreground">--</span>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-divider p-4 text-center">
            <p className="text-foreground/50">
              Incident timeline will appear here
            </p>
          </div>
        </div>
      </PlaceholderCard>
    </div>
  );
}
