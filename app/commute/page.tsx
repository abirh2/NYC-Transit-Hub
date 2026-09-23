import { Metadata } from "next";
import { CommuteClient } from "./CommuteClient";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "Commute Assistant",
  description: "Get personalized departure suggestions for your daily commute",
};

export default function CommutePage() {
  return (
    <PageContainer>
      <CommuteClient />
    </PageContainer>
  );
}
