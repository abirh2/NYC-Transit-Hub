import { Metadata } from "next";
import { IncidentsClient } from "./IncidentsClient";
import { PageContainer, PageHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Incidents | NYC Transit Hub",
  description: "Browse service alerts and disruption history for NYC subway",
};

export default function IncidentsPage() {
  return (
    <PageContainer width="wide">
      <PageHeader
        title="Incident Explorer"
        description="Browse service alerts and disruption history"
      />
      <IncidentsClient />
    </PageContainer>
  );
}
