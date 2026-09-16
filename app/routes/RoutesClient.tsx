"use client";

/**
 * RoutesClient Component
 * 
 * Standalone route finder page for planning transit trips.
 */

import { Card, CardBody } from "@heroui/react";
import { MapPin } from "lucide-react";
import { RouteFinder } from "@/components/accessibility";
import { PageContainer, PageHeader } from "@/components/layout";

export function RoutesClient() {
  return (
    <PageContainer>
      <PageHeader
        title="Route Finder"
        description="Plan your transit trip between any two locations in NYC"
      />

      <div className="space-y-6">
      {/* Tips */}
      <Card className="bg-primary/5 border border-primary/20">
        <CardBody className="py-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Tips for best results</p>
              <ul className="text-sm text-foreground/70 space-y-1">
                <li>• Enter an address, intersection, or landmark name</li>
                <li>• Select from the dropdown suggestions for accurate coordinates</li>
                <li>• Enable &quot;Accessible routes only&quot; to avoid stairs and broken elevators</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Route Finder */}
      <RouteFinder />
      </div>
    </PageContainer>
  );
}

