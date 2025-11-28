import { Radio } from "lucide-react";
import { PlaceholderCard } from "@/components/ui";

export const metadata = {
  title: "Realtime Tracker",
  description: "Watch trains move in real-time across the NYC subway system",
};

export default function RealtimePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Live Train Tracker
        </h1>
        <p className="mt-1 text-foreground/70">
          Watch trains move in real-time across the subway system
        </p>
      </div>

      {/* Placeholder Content */}
      <PlaceholderCard
        icon={<Radio className="h-5 w-5" />}
        title="Coming Soon"
        phase="Phase 2"
        description="This page will display a visual representation of train positions along selected lines. You'll be able to select lines, see train locations update in real-time, and click on individual trains to see their destination and upcoming stops."
      >
        <div className="mt-4 rounded-lg border border-dashed border-divider p-8 text-center">
          <p className="text-foreground/50">
            Line diagram with train positions will appear here
          </p>
        </div>
      </PlaceholderCard>
    </div>
  );
}
