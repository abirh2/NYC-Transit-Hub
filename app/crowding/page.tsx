import { getNetworkCrowding } from "@/lib/crowding";
import { CrowdingList } from "@/components/crowding/CrowdingList";
import { PageContainer } from "@/components/layout";

export const revalidate = 60; // Cache for 60 seconds

export default async function CrowdingPage() {
  // Use simpler legacy crowding for faster page loads
  // Enhanced view can be toggled client-side via API
  const crowdingData = await getNetworkCrowding();

  return (
    <PageContainer width="wide">
      <CrowdingList data={crowdingData} enhanced={false} />
    </PageContainer>
  );
}
