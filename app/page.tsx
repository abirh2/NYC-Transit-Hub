import {
  StationCard,
  AlertsCard,
  LiveTrackerCard,
  CommuteCard,
  IncidentsCard,
  ReliabilityCard,
  CrowdingCard,
  SystemStatusCard,
} from "@/components/dashboard";
import { PageContainer, PageHeader } from "@/components/layout";

export default function HomePage() {
  return (
    <PageContainer width="wide">
      <PageHeader
        title="NYC Transit Hub"
        description="Real-time MTA transit info, analytics, and accessibility-aware routing"
      />

      <div className="space-y-6">
        {/* Row 1 - Primary: Your Station + Service Alerts */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <StationCard />
          <AlertsCard />
        </div>

        {/* Row 2 - Secondary: Live Tracker, Commute Assistant, Incidents */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          <LiveTrackerCard />
          <CommuteCard />
          <IncidentsCard />
        </div>

        {/* Row 3 - Tertiary: Reliability, Crowding */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 auto-rows-fr">
          <ReliabilityCard />
          <CrowdingCard />
        </div>

        {/* System Status */}
        <SystemStatusCard />
      </div>
    </PageContainer>
  );
}
