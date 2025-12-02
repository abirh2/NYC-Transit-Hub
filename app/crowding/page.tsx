import { getNetworkCrowding } from "@/lib/crowding";
import { CrowdingList } from "@/components/crowding/CrowdingList";

export const revalidate = 60; // Cache for 60 seconds

export default async function CrowdingPage() {
  // Use simpler legacy crowding for faster page loads
  // Enhanced view can be toggled client-side via API
  const crowdingData = await getNetworkCrowding();

  return <CrowdingList data={crowdingData} enhanced={false} />;
}
