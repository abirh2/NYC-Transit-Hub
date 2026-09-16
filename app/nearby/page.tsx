import { MapPin } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";

export default function NearbyPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Nearby"
        description="Find transit options around your current location."
      />
      <EmptyState
        icon={<MapPin className="h-6 w-6" />}
        title="Coming soon"
        description="Nearby stations, stops, and arrivals will appear here soon."
      />
    </PageContainer>
  );
}
