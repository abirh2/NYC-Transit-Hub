import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout";
import { NearbyClient } from "@/components/nearby/NearbyClient";

export const metadata: Metadata = {
  title: "Nearby Transit | NYC Transit Hub",
  description: "Find nearby subway stations, bus stops, and live departures.",
};

export default function NearbyPage() {
  return (
    <PageContainer width="wide">
      <PageHeader
        title="Nearby"
        description="The next subway trains and buses from boarding locations around you."
      />
      <NearbyClient />
    </PageContainer>
  );
}
