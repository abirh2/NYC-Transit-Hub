import { Metadata } from "next";
import { AccessibilityClient } from "./AccessibilityClient";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "Find accessible subway routes and check elevator/escalator status",
};

export default function AccessibilityPage() {
  return <Suspense fallback={null}><AccessibilityClient /></Suspense>;
}
