import { Metadata } from "next";
import { CommuteClient } from "./CommuteClient";

export const metadata: Metadata = {
  title: "Commute Assistant | NYC Transit Hub",
  description: "Get personalized departure suggestions for your daily commute",
};

export default function CommutePage() {
  return <CommuteClient />;
}
