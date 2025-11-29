import { ReliabilityClient } from "@/components/reliability";

export const metadata = {
  title: "Reliability",
  description: "Track service performance, incident patterns, and line reliability metrics",
};

export default function ReliabilityPage() {
  return <ReliabilityClient />;
}
