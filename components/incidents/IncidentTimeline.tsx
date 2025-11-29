"use client";

import { useState, ReactNode } from "react";
import { Card, CardBody, Chip, Spinner, Button } from "@heroui/react";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Clock,
  CheckCircle2,
  Calendar,
  Bus,
  Accessibility
} from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import { formatDistanceToNow, format } from "date-fns";
import type { ServiceAlert, AlertSeverity, AlertType } from "@/types/mta";

interface IncidentTimelineProps {
  incidents: ServiceAlert[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

// Determine incident status
type IncidentStatus = "active" | "upcoming" | "resolved";

function getIncidentStatus(incident: ServiceAlert): IncidentStatus {
  const now = new Date();
  const hasStarted = !incident.activePeriodStart || incident.activePeriodStart <= now;
  const hasEnded = incident.activePeriodEnd && incident.activePeriodEnd <= now;
  
  if (hasEnded) return "resolved";
  if (!hasStarted) return "upcoming";
  return "active";
}

// Get icon for severity
function getSeverityIcon(severity: AlertSeverity) {
  switch (severity) {
    case "SEVERE":
      return <AlertTriangle className="h-4 w-4" />;
    case "WARNING":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

// Get color for severity
function getSeverityColor(severity: AlertSeverity): "danger" | "warning" | "default" {
  switch (severity) {
    case "SEVERE":
      return "danger";
    case "WARNING":
      return "warning";
    default:
      return "default";
  }
}

// Get label for severity
function getSeverityLabel(severity: AlertSeverity): string {
  switch (severity) {
    case "SEVERE":
      return "Major";
    case "WARNING":
      return "Delays";
    default:
      return "Info";
  }
}

// Format alert type for display
function formatAlertType(type: AlertType): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Get color for alert type chip (using colors with good dark mode contrast)
function getTypeColor(type: AlertType): "default" | "primary" | "secondary" | "success" | "warning" | "danger" {
  switch (type) {
    case "DELAY":
      return "warning";
    case "STATION_CLOSURE":
    case "SHUTTLE_BUS":
      return "danger";
    case "PLANNED_WORK":
      return "success";
    case "SERVICE_CHANGE":
    case "DETOUR":
      return "secondary";
    case "REDUCED_SERVICE":
      return "warning";
    default:
      return "default";
  }
}

// Valid train line identifiers
const TRAIN_LINES = new Set([
  "1", "2", "3", "4", "5", "6", "7",
  "A", "C", "E", "B", "D", "F", "M",
  "G", "J", "Z", "L", "N", "Q", "R", "W", "S", "SIR"
]);

/**
 * Parse text and replace [X] train references and special icons with actual components
 * Handles:
 * - [E], [7], etc. -> SubwayBullet icons
 * - [shuttle bus icon] -> Bus icon
 * - [accessibility icon] -> Accessibility icon
 */
function parseTrainReferences(text: string): ReactNode[] {
  // Match [X] patterns including special icons
  const regex = /\[(shuttle bus icon|accessibility icon|[A-Z0-9]+)\]/gi;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const content = match[1].toLowerCase();
    
    if (content === "shuttle bus icon") {
      // Shuttle bus icon
      parts.push(
        <span key={`${match.index}-bus`} className="inline-flex items-center align-middle mx-0.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded text-xs font-medium">
          <Bus className="h-3.5 w-3.5 mr-1" />
          Shuttle
        </span>
      );
    } else if (content === "accessibility icon") {
      // Accessibility icon
      parts.push(
        <span key={`${match.index}-ada`} className="inline-flex items-center align-middle mx-0.5">
          <Accessibility className="h-4 w-4 text-blue-500" />
        </span>
      );
    } else {
      const line = content.toUpperCase();
      if (TRAIN_LINES.has(line)) {
        // Replace with subway bullet wrapped in span for valid HTML
        parts.push(
          <span key={`${match.index}-${line}`} className="inline-flex align-middle mx-0.5">
            <SubwayBullet line={line} size="sm" />
          </span>
        );
      } else {
        // Keep original text if not a valid train line
        parts.push(match[0]);
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Render description with styled sections and train icons
 * Uses div and span instead of p tags to allow inline SubwayBullet components
 */
function FormattedDescription({ text }: { text: string }) {
  // Split into paragraphs/sections
  const sections = text.split(/\n\n+/);

  return (
    <div className="space-y-3 text-sm">
      {sections.map((section, idx) => {
        const lines = section.split(/\n/);
        
        return (
          <div key={idx}>
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return null;

              // Check if it's a header-like line (ends with : or ?)
              const isHeader = /^[A-Z].*[?:]$/.test(trimmed) || 
                              trimmed.startsWith("What's") ||
                              trimmed.startsWith("Special Note");

              if (isHeader) {
                return (
                  <div key={lineIdx} className="font-semibold text-foreground mb-1">
                    {parseTrainReferences(trimmed)}
                  </div>
                );
              }

              // Check if it's a numbered list item
              const isListItem = /^\d+\./.test(trimmed);
              if (isListItem) {
                return (
                  <div key={lineIdx} className="text-foreground/90 pl-2 mb-1">
                    {parseTrainReferences(trimmed)}
                  </div>
                );
              }

              // Regular paragraph
              return (
                <div key={lineIdx} className="text-foreground/90 leading-relaxed mb-1">
                  {parseTrainReferences(trimmed)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function IncidentCard({ incident }: { incident: ServiceAlert }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDescription = incident.descriptionText && incident.descriptionText !== incident.headerText;
  
  const status = getIncidentStatus(incident);
  
  return (
    <Card 
      className={`transition-all ${
        incident.severity === "SEVERE" 
          ? "border-l-4 border-l-danger" 
          : incident.severity === "WARNING"
          ? "border-l-4 border-l-warning"
          : "border-l-4 border-l-default-300"
      }`}
    >
      <CardBody className="py-3 px-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Lines and Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* Affected Lines */}
              <div className="flex items-center gap-1 flex-wrap">
                {incident.affectedRoutes.slice(0, 6).map((line) => (
                  <SubwayBullet key={line} line={line} size="sm" />
                ))}
                {incident.affectedRoutes.length > 6 && (
                  <span className="text-xs text-foreground/50">
                    +{incident.affectedRoutes.length - 6}
                  </span>
                )}
              </div>
              
              {/* Severity Badge */}
              <Chip
                size="sm"
                color={getSeverityColor(incident.severity)}
                variant="flat"
                startContent={getSeverityIcon(incident.severity)}
              >
                {getSeverityLabel(incident.severity)}
              </Chip>
              
              {/* Type Badge */}
              <Chip
                size="sm"
                color={getTypeColor(incident.alertType)}
                variant="bordered"
              >
                {formatAlertType(incident.alertType)}
              </Chip>
              
              {/* Status Badge - using custom classes for better dark mode visibility */}
              {status === "active" && (
                <Chip size="sm" color="success" variant="dot">
                  Active
                </Chip>
              )}
              {status === "upcoming" && (
                <Chip 
                  size="sm" 
                  variant="dot" 
                  classNames={{
                    base: "border-sky-400 dark:border-sky-400",
                    dot: "bg-sky-400",
                    content: "text-sky-600 dark:text-sky-400"
                  }}
                  startContent={<Calendar className="h-3 w-3" />}
                >
                  Upcoming
                </Chip>
              )}
              {status === "resolved" && (
                <Chip size="sm" color="default" variant="dot" startContent={<CheckCircle2 className="h-3 w-3" />}>
                  Resolved
                </Chip>
              )}
            </div>
            
            {/* Header Text */}
            <div className="text-sm text-foreground leading-relaxed">
              {parseTrainReferences(incident.headerText)}
            </div>
            
            {/* Time Info */}
            <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
              {status === "upcoming" && incident.activePeriodStart && (
                <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Starts {formatDistanceToNow(incident.activePeriodStart, { addSuffix: true })}
                  </span>
                </div>
              )}
              {status === "active" && incident.activePeriodStart && (
                <div className="flex items-center gap-1 text-foreground/60">
                  <Clock className="h-3 w-3" />
                  <span>
                    Started {formatDistanceToNow(incident.activePeriodStart, { addSuffix: true })}
                  </span>
                </div>
              )}
              {status === "resolved" && incident.activePeriodEnd && (
                <div className="flex items-center gap-1 text-foreground/60">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>
                    Ended {formatDistanceToNow(incident.activePeriodEnd, { addSuffix: true })}
                  </span>
                </div>
              )}
              {incident.activePeriodEnd && status !== "resolved" && (
                <span className="text-foreground/60">
                  Ends {format(incident.activePeriodEnd, "MMM d, h:mm a")}
                </span>
              )}
            </div>
          </div>
          
          {/* Expand Button */}
          {hasDescription && (
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
          )}
        </div>
        
        {/* Expanded Description */}
        {isExpanded && hasDescription && (
          <div className="mt-3 pt-3 border-t border-divider">
            <FormattedDescription text={incident.descriptionText!} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function IncidentTimeline({ incidents, isLoading, error, emptyMessage }: IncidentTimelineProps) {
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
          <p className="text-foreground font-medium">Failed to load incidents</p>
          <p className="text-sm text-foreground/60 mt-1">{error}</p>
        </CardBody>
      </Card>
    );
  }

  if (incidents.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
          <p className="text-lg font-medium text-foreground">No Incidents Found</p>
          <p className="text-sm text-foreground/60 mt-1">
            {emptyMessage || "There are no service incidents matching your filters."}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <IncidentCard key={incident.id} incident={incident} />
      ))}
    </div>
  );
}
