import { TrainFront } from "lucide-react";
import { PlaceholderCard } from "@/components/ui";

export const metadata = {
  title: "Station Board",
  description: "View upcoming trains at your favorite stations",
};

export default function BoardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Station Board
        </h1>
        <p className="mt-1 text-foreground/70">
          View upcoming departures at your favorite stations
        </p>
      </div>

      {/* Placeholder Content */}
      <PlaceholderCard
        icon={<TrainFront className="h-5 w-5" />}
        title="Coming Soon"
        phase="Phase 2"
        description="This page will show upcoming train arrivals for your selected stations. You'll see departure times, destinations, and any active service alerts affecting your stations."
      >
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-dashed border-divider p-4 text-center">
            <p className="text-foreground/50">Station 1 departures</p>
          </div>
          <div className="rounded-lg border border-dashed border-divider p-4 text-center">
            <p className="text-foreground/50">Station 2 departures</p>
          </div>
          <div className="rounded-lg border border-dashed border-divider p-4 text-center">
            <p className="text-foreground/50">Station 3 departures</p>
          </div>
        </div>
      </PlaceholderCard>
    </div>
  );
}
