"use client";

/**
 * RoutesClient Component
 * 
 * Standalone route finder page for planning transit trips.
 */

import { Card, CardBody } from "@heroui/react";
import { Navigation, MapPin } from "lucide-react";
import { RouteFinder } from "@/components/accessibility";

export function RoutesClient() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Navigation className="h-7 w-7 text-primary" />
          Route Finder
        </h1>
        <p className="mt-1 text-foreground/70">
          Plan your transit trip between any two locations in NYC
        </p>
      </div>

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
  );
}

