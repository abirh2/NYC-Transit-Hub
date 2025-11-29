import { Metadata } from "next";
import { IncidentsClient } from "./IncidentsClient";

export const metadata: Metadata = {
  title: "Incidents | NYC Transit Hub",
  description: "Browse service alerts and disruption history for NYC subway",
};

export default function IncidentsPage() {
  return <IncidentsClient />;
}
