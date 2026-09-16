import { ReliabilityClient } from "@/components/reliability";
import { PageContainer } from "@/components/layout";

export const metadata = {
  title: "Reliability",
  description: "Track service performance, incident patterns, and line reliability metrics",
};

export default function ReliabilityPage() {
  return (
    <PageContainer width="wide">
      <ReliabilityClient />
    </PageContainer>
  );
}
