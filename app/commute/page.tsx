import { Clock } from "lucide-react";
import { PlaceholderCard } from "@/components/ui";

export const metadata = {
  title: "Commute Assistant",
  description: "Get personalized departure suggestions for your daily commute",
};

export default function CommutePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Commute Assistant
        </h1>
        <p className="mt-1 text-foreground/70">
          Get personalized departure suggestions for your daily commute
        </p>
      </div>

      {/* Placeholder Content */}
      <PlaceholderCard
        icon={<Clock className="h-5 w-5" />}
        title="Coming Soon"
        phase="Phase 4"
        description="This page will provide smart commute recommendations based on your home and work stations. You'll see optimal departure times, alternative routes, and historical commute time data."
      >
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-dashed border-divider p-4">
            <p className="text-sm text-foreground/50">Home station</p>
            <p className="text-foreground">Not configured</p>
          </div>
          <div className="rounded-lg border border-dashed border-divider p-4">
            <p className="text-sm text-foreground/50">Work station</p>
            <p className="text-foreground">Not configured</p>
          </div>
          <div className="rounded-lg border border-dashed border-divider p-4">
            <p className="text-sm text-foreground/50">Next departure</p>
            <p className="text-foreground">--</p>
          </div>
        </div>
      </PlaceholderCard>
    </div>
  );
}
