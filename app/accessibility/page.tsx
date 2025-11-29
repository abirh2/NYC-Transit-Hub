import { Metadata } from "next";
import { AccessibilityClient } from "./AccessibilityClient";

export const metadata: Metadata = {
  title: "Accessibility | NYC Transit Hub",
  description: "Find accessible subway routes and check elevator/escalator status",
};

export default function AccessibilityPage() {
  return <AccessibilityClient />;
}
