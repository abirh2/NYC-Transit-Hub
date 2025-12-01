import { Metadata } from "next";
import { RoutesClient } from "./RoutesClient";

export const metadata: Metadata = {
  title: "Route Finder | NYC Transit Hub",
  description: "Find the best transit route between any two locations in NYC",
};

export default function RoutesPage() {
  return <RoutesClient />;
}

