import type { Metadata } from "next";
import { NearbyClient } from "@/components/nearby/NearbyClient";

export const metadata: Metadata = {
  title: "Nearby Transit | NYC Transit Hub",
  description: "Find nearby subway stations, bus stops, and live departures.",
};

export default function NearbyPage() {
  return (
    <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:mx-auto lg:mt-0 lg:max-w-7xl">
      <NearbyClient />
    </div>
  );
}
