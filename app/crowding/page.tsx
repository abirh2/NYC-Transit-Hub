import { Users } from "lucide-react";
import { PlaceholderCard } from "@/components/ui";

export const metadata = {
  title: "Crowding",
  description: "Estimate how packed trains are based on headways and delays",
};

export default function CrowdingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Crowding Estimates
        </h1>
        <p className="mt-1 text-foreground/70">
          Approximate how packed lines are right now
        </p>
      </div>

      {/* Placeholder Content */}
      <PlaceholderCard
        icon={<Users className="h-5 w-5" />}
        title="Coming Soon"
        phase="Phase 5"
        description="This page will estimate crowding levels based on train headways and delays. Short headways typically mean more capacity and less crowding, while big gaps often indicate packed trains."
      >
        <div className="mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-foreground/70">Most crowded</span>
              <span className="text-foreground/50">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground/70">Least crowded</span>
              <span className="text-foreground/50">--</span>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-divider p-8 text-center">
            <p className="text-foreground/50">
              Crowding heatmap will appear here
            </p>
          </div>
        </div>
      </PlaceholderCard>
    </div>
  );
}
