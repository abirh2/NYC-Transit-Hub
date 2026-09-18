import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout";
import { NearbyClient } from "@/components/nearby/NearbyClient";

export const metadata: Metadata = {
  title: "Nearby Subway | NYC Transit Hub",
  description: "Find nearby subway stations and the next individual train.",
};

export default function NearbyPage() {
  return (
    <PageContainer width="wide">
      <PageHeader
        title="Nearby"
        description="The next subway train from the stations around you."
      />
      <NearbyClient />
    </PageContainer>
  );
}
