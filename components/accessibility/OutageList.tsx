"use client";

import { useState } from "react";
import { Card, CardBody, Chip, Spinner, Button } from "@heroui/react";
import { 
  MoveVertical, 
  Scaling,
  Clock, 
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  HardHat,
  Accessibility
} from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import { formatDistanceToNow, format } from "date-fns";
import type { EquipmentOutage } from "@/types/mta";

interface OutageListProps {
  outages: EquipmentOutage[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  isUpcoming?: boolean;
}

// Get reason icon
function getReasonIcon(reason: string | null) {
  if (!reason) return <Wrench className="h-4 w-4" />;
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes("capital") || lowerReason.includes("replacement")) {
    return <HardHat className="h-4 w-4" />;
  }
  if (lowerReason.includes("maintenance")) {
    return <Wrench className="h-4 w-4" />;
  }
  return <AlertTriangle className="h-4 w-4" />;
}

// Get color based on outage reason - using secondary/warning for better dark mode legibility
function getReasonColor(reason: string | null): "default" | "warning" | "secondary" | "danger" {
  if (!reason) return "default";
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes("capital") || lowerReason.includes("replacement")) {
    return "secondary"; // Changed from primary to secondary for better legibility
  }
  if (lowerReason.includes("maintenance")) {
    return "warning";
  }
  if (lowerReason.includes("repair")) {
    return "danger";
  }
  return "default";
}

function OutageCard({ outage, isUpcoming = false }: { outage: EquipmentOutage; isUpcoming?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isElevator = outage.equipmentType === "ELEVATOR";
  const Icon = isElevator ? MoveVertical : Scaling;
  
  return (
    <Card 
      className={`transition-all ${
        outage.adaCompliant 
          ? "border-l-4 border-l-danger" 
          : "border-l-4 border-l-warning"
      }`}
    >
      <CardBody className="py-3 px-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Station and Equipment Info */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* Equipment Type Icon */}
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isElevator ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              
              {/* Station Name */}
              <span className="font-semibold text-foreground">{outage.stationName}</span>
              
              {/* Line Bullets */}
              <div className="flex items-center gap-1">
                {outage.trainLines.slice(0, 4).map((line) => (
                  <SubwayBullet key={line} line={line} size="sm" />
                ))}
                {outage.trainLines.length > 4 && (
                  <span className="text-xs text-foreground/50">
                    +{outage.trainLines.length - 4}
                  </span>
                )}
              </div>
              
              {/* ADA Badge */}
              {outage.adaCompliant && (
                <Chip
                  size="sm"
                  color="danger"
                  variant="flat"
                  startContent={<Accessibility className="h-3 w-3" />}
                >
                  ADA
                </Chip>
              )}
              
              {/* Equipment Type (Elevator/Escalator) */}
              <Chip 
                size="sm" 
                variant="bordered"
                startContent={<Icon className="h-3 w-3" />}
              >
                {isElevator ? "Elevator" : "Escalator"}
              </Chip>
            </div>
            
            {/* Serving Description - Formatted nicely */}
            {outage.serving && (
              <div className="text-sm text-foreground/70 mb-2 flex items-start gap-2">
                <span className="text-foreground/50 shrink-0">Serves:</span>
                <span className="capitalize">{outage.serving}</span>
              </div>
            )}
            
            {/* Reason and Time Info */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Reason */}
              {outage.outageReason && (
                <Chip
                  size="sm"
                  variant="flat"
                  color={getReasonColor(outage.outageReason)}
                  startContent={getReasonIcon(outage.outageReason)}
                >
                  {outage.outageReason}
                </Chip>
              )}
              
              {/* Start Time */}
              {outage.outageStartTime && (
                <div className="flex items-center gap-1 text-xs text-foreground/60">
                  {isUpcoming ? (
                    <>
                      <Calendar className="h-3 w-3" />
                      <span>
                        Starts {format(outage.outageStartTime, "MMM d, h:mm a")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>
                        Out since {formatDistanceToNow(outage.outageStartTime, { addSuffix: true })}
                      </span>
                    </>
                  )}
                </div>
              )}
              
              {/* Estimated Return */}
              {outage.estimatedReturn && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>
                    Returns {format(outage.estimatedReturn, "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Expand Button */}
          <Button
            size="sm"
            variant="light"
            isIconOnly
            onPress={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse details" : "Expand details"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-divider">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-foreground/60">Equipment Type</p>
                <p className="font-medium">{isElevator ? "Elevator" : "Escalator"}</p>
              </div>
              <div>
                <p className="text-foreground/60">Equipment ID</p>
                <p className="font-medium">{outage.equipmentId}</p>
              </div>
              {outage.borough && (
                <div>
                  <p className="text-foreground/60">Borough</p>
                  <p className="font-medium">{outage.borough}</p>
                </div>
              )}
              <div>
                <p className="text-foreground/60">ADA Compliant</p>
                <p className="font-medium">{outage.adaCompliant ? "Yes" : "No"}</p>
              </div>
              {outage.serving && (
                <div className="col-span-2">
                  <p className="text-foreground/60">Serves</p>
                  <p className="font-medium">{outage.serving}</p>
                </div>
              )}
              {outage.outageStartTime && (
                <div>
                  <p className="text-foreground/60">Outage Started</p>
                  <p className="font-medium">
                    {format(outage.outageStartTime, "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              )}
              {outage.estimatedReturn && (
                <div>
                  <p className="text-foreground/60">Estimated Return</p>
                  <p className="font-medium">
                    {format(outage.estimatedReturn, "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function OutageList({ 
  outages, 
  isLoading, 
  error, 
  emptyMessage,
  isUpcoming = false 
}: OutageListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-danger mb-3" />
          <p className="text-foreground font-medium">Failed to load outages</p>
          <p className="text-sm text-foreground/60 mt-1">{error}</p>
        </CardBody>
      </Card>
    );
  }

  if (outages.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
          <p className="text-lg font-medium text-foreground">No Outages Found</p>
          <p className="text-sm text-foreground/60 mt-1">
            {emptyMessage || "All elevators and escalators are operating normally."}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {outages.map((outage, index) => (
        <OutageCard 
          key={`${outage.equipmentId}-${outage.stationName}-${index}`} 
          outage={outage} 
          isUpcoming={isUpcoming}
        />
      ))}
    </div>
  );
}

