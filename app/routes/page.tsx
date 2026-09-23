import { Metadata } from "next";
import { RoutesClient } from "./RoutesClient";

export const metadata: Metadata = {
  title: "Plan",
  description: "Plan a supported transit trip between two NYC locations.",
};

export default function RoutesPage() {
  return <RoutesClient />;
}
