import { Metadata } from "next";
import { IncidentsClient } from "./IncidentsClient";
import { PageContainer, PageHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Service Changes",
  description: "Current and upcoming NYC transit service changes",
};

export default function IncidentsPage() {
  return (
    <PageContainer width="wide">
      <PageHeader
        title="Service Changes"
        description="What is affecting riders now, followed by upcoming planned work."
      />
      <IncidentsClient />
    </PageContainer>
  );
}
