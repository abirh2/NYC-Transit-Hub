import { Accessibility } from "lucide-react";
import { PlaceholderCard } from "@/components/ui";

export const metadata = {
  title: "Accessibility",
  description: "Check elevator and escalator status for accessible routing",
};

export default function AccessibilityPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Accessibility Status
        </h1>
        <p className="mt-1 text-foreground/70">
          Check elevator and escalator status for accessible routing
        </p>
      </div>

      {/* Placeholder Content */}
      <PlaceholderCard
        icon={<Accessibility className="h-5 w-5" />}
        title="Coming Soon"
        phase="Phase 4"
        description="This page will show real-time elevator and escalator status across the subway system. You'll be able to find accessible routes that avoid stations with out-of-service equipment."
      >
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-dashed border-divider p-4">
            <p className="text-foreground/50">Accessible route finder</p>
            <span className="text-sm text-foreground/30">Coming soon</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-dashed border-divider p-4">
            <p className="text-foreground/50">Current outages list</p>
            <span className="text-sm text-foreground/30">Coming soon</span>
          </div>
        </div>
      </PlaceholderCard>
    </div>
  );
}
