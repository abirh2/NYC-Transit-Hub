"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Chip, Accordion, AccordionItem, Button, Spinner, Modal, ModalContent, ModalHeader, ModalBody, useDisclosure } from "@heroui/react";
import { SubwayBullet } from "@/components/ui";
import { Users, Info, TrendingUp, Clock, AlertTriangle, Navigation2, Sparkles, HelpCircle } from "lucide-react";
import type { RouteCrowdingEnhanced, RouteCrowding, CrowdingLevel, SegmentCrowding, Direction, SubwayLine, NetworkCrowding } from "@/types/mta";
// import { CrowdingFilters } from "./CrowdingFilters";
import { ViewToggle } from "./ViewToggle";
import { SegmentDiagram } from "./SegmentDiagram";

interface CrowdingListProps {
  data: RouteCrowding[] | RouteCrowdingEnhanced[];
  enhanced?: boolean;
}

export function CrowdingList({ data, enhanced = false }: CrowdingListProps) {
  const [view, setView] = useState<"list" | "diagram">("list");
  const [direction] = useState<Direction | "all">("all"); // TODO: Wire up direction filter
  const [enhancedMode, setEnhancedMode] = useState(enhanced);
  const [enhancedData, setEnhancedData] = useState<RouteCrowdingEnhanced[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Fetch enhanced data when user toggles to enhanced mode
  useEffect(() => {
    if (enhancedMode && !enhanced && !enhancedData) {
      // Use callback to avoid synchronous setState in effect
      const fetchEnhancedData = async () => {
        try {
          setLoading(true);
          const res = await fetch("/api/metrics/crowding?enhanced=true");
          const networkData: NetworkCrowding = await res.json();
          setEnhancedData(networkData.routes);
        } catch (err) {
          console.error("Failed to fetch enhanced crowding:", err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchEnhancedData();
    }
  }, [enhancedMode, enhanced, enhancedData]);

  // Use enhanced data if available, otherwise fall back to simple
  const displayData = enhancedMode && enhancedData ? enhancedData : data;
  const isEnhancedView = enhancedMode && (enhanced || enhancedData !== null);

  if (!isEnhancedView) {
    // Simple crowding view with toggle button
    return <SimpleCrowdingList data={data as RouteCrowding[]} onEnhancedToggle={() => setEnhancedMode(true)} loading={loading} />;
  }

  const enhancedDataTyped = displayData as RouteCrowdingEnhanced[];

  // Group by level
  const high = enhancedDataTyped.filter((c) => c.avgLevel === "HIGH");
  const medium = enhancedDataTyped.filter((c) => c.avgLevel === "MEDIUM");
  const low = enhancedDataTyped.filter((c) => c.avgLevel === "LOW");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8" />
              Real-Time Crowding
            </h1>
            <Chip size="sm" color="primary" variant="flat" startContent={<Sparkles className="h-3 w-3" />}>
              Enhanced
            </Chip>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={onOpen}
              aria-label="How it works"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-foreground/70 max-w-2xl">
            Multi-factor crowding estimates combining train headways, demand patterns, delays, and service alerts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={() => {
              setEnhancedMode(false);
              setEnhancedData(null);
            }}
          >
            Simple View
          </Button>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {/* Info Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center">
            <Sparkles className="h-5 w-5" />
            How Enhanced Crowding Works
          </ModalHeader>
          <ModalBody className="pb-6">
            <div className="space-y-4">
              <p className="text-sm">
                Enhanced crowding analysis combines multiple real-time factors to provide accurate estimates of train crowding:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Headway (35% weight)</p>
                    <p className="text-sm text-foreground/70">
                      Time gaps between trains. Longer gaps mean passengers accumulate on platforms, leading to crowded trains.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Demand (35% weight)</p>
                    <p className="text-sm text-foreground/70">
                      Time-of-day patterns. Rush hours (7-10am, 5-8pm) see higher ridership than midday or late night.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Delays (20% weight)</p>
                    <p className="text-sm text-foreground/70">
                      Real-time train delays from MTA feeds. Delays cause train bunching and uneven crowding.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Service Alerts (10% weight)</p>
                    <p className="text-sm text-foreground/70">
                      Active service disruptions like track work or signal problems that reduce capacity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-content2 p-3 rounded-lg">
                <p className="text-sm font-semibold mb-2">Scoring:</p>
                <div className="text-xs space-y-1">
                  <p><span className="text-success font-medium">0-33:</span> Low crowding - good service</p>
                  <p><span className="text-warning font-medium">34-66:</span> Medium crowding - busy but manageable</p>
                  <p><span className="text-danger font-medium">67-100:</span> High crowding - expect delays and packed trains</p>
                </div>
              </div>

              <p className="text-xs text-foreground/50">
                Scores update every 60 seconds based on live MTA data. Click on routes to see segment-level breakdown by direction.
              </p>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Info Card */}
      <Card className="bg-content2/50 border-none">
        <CardBody>
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-2">
              <p>
                <strong>Enhanced Crowding Analysis:</strong> We analyze multiple factors including train frequency, time-of-day demand, real-time delays, and service alerts to estimate crowding levels.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Chip size="sm" color="success" variant="flat">Low</Chip>
                  <span className="text-foreground/60">Score 0-33</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip size="sm" color="warning" variant="flat">Medium</Chip>
                  <span className="text-foreground/60">Score 34-66</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip size="sm" color="danger" variant="flat">High</Chip>
                  <span className="text-foreground/60">Score 67-100</span>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* High Crowding */}
      {high.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-danger">
            High Crowding / Delays
          </h2>
          {view === "list" ? (
            <div className="space-y-3">
              {high.map((route) => (
                <EnhancedRouteCard key={route.routeId} route={route} direction={direction} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {high.map((route) => (
                <SegmentDiagram 
                  key={route.routeId} 
                  routeId={route.routeId as SubwayLine} 
                  segments={route.segments} 
                  direction={direction}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Medium Crowding */}
      {medium.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-warning">
            Moderate Crowding
          </h2>
          {view === "list" ? (
            <div className="space-y-3">
              {medium.map((route) => (
                <EnhancedRouteCard key={route.routeId} route={route} direction={direction} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {medium.map((route) => (
                <SegmentDiagram 
                  key={route.routeId} 
                  routeId={route.routeId as SubwayLine} 
                  segments={route.segments} 
                  direction={direction}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Low Crowding */}
      {low.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-success">
            Good Service / Low Crowding
          </h2>
          {view === "list" ? (
            <div className="space-y-3">
              {low.map((route) => (
                <EnhancedRouteCard key={route.routeId} route={route} direction={direction} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {low.map((route) => (
                <SegmentDiagram 
                  key={route.routeId} 
                  routeId={route.routeId as SubwayLine} 
                  segments={route.segments} 
                  direction={direction}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// Enhanced route card with segment breakdown
function EnhancedRouteCard({ route, direction }: { route: RouteCrowdingEnhanced; direction: Direction | "all" }) {
  const levelColor = getLevelColor(route.avgLevel);

  // Filter segments by direction
  const filteredSegments = direction === "all"
    ? route.segments
    : route.segments.filter(s => s.direction === direction);

  return (
    <Card>
      <CardBody>
        <Accordion>
          <AccordionItem
            key="1"
            title={
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <SubwayBullet line={route.routeId} />
                  <div>
                    <p className="font-medium">Score: {route.avgScore}/100</p>
                    <p className="text-xs text-foreground/50">Click to see segments</p>
                  </div>
                </div>
                <Chip color={levelColor} variant="flat" size="sm">
                  {route.avgLevel}
                </Chip>
              </div>
            }
          >
            <div className="space-y-3 pt-3">
              {filteredSegments.map((segment) => (
                <SegmentItem key={`${segment.segmentId}-${segment.direction}`} segment={segment} />
              ))}
            </div>
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  );
}

// Individual segment item
function SegmentItem({ segment }: { segment: SegmentCrowding }) {
  const levelColor = getLevelColor(segment.crowdingLevel);

  return (
    <div className="flex items-start justify-between p-3 bg-content2 rounded-lg">
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2">
          <Navigation2 className={`h-4 w-4 flex-shrink-0 ${segment.direction === "N" ? "rotate-0" : "rotate-180"}`} />
          <span className="font-medium text-sm">{segment.segmentName}</span>
          <span className="text-xs text-foreground/50">
            ({segment.direction === "N" ? "Northbound" : "Southbound"})
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <FactorBadge icon={Clock} label="Headway" value={segment.factors.headway} />
          <FactorBadge icon={TrendingUp} label="Demand" value={segment.factors.demand} />
          <FactorBadge icon={Clock} label="Delays" value={segment.factors.delay} />
          <FactorBadge icon={AlertTriangle} label="Alerts" value={segment.factors.alerts} />
        </div>
      </div>
      <Chip color={levelColor} variant="flat" size="sm" className="ml-2">
        {segment.crowdingScore}
      </Chip>
    </div>
  );
}

function FactorBadge({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-foreground/70">
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="whitespace-nowrap">{label}: {(value * 100).toFixed(0)}%</span>
    </div>
  );
}

// Legacy simple crowding list
function SimpleCrowdingList({ data, onEnhancedToggle, loading }: { data: RouteCrowding[]; onEnhancedToggle: () => void; loading: boolean }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const high = data.filter((c) => c.crowdingLevel === "HIGH");
  const medium = data.filter((c) => c.crowdingLevel === "MEDIUM");
  const low = data.filter((c) => c.crowdingLevel === "LOW");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8" />
              Real-Time Crowding
            </h1>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={onOpen}
              aria-label="How it works"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-foreground/70 max-w-2xl">
            Crowding estimates based on current train headways (time between trains).
          </p>
        </div>
        <Button
          color="primary"
          variant="flat"
          startContent={loading ? <Spinner size="sm" color="current" /> : <Sparkles className="h-4 w-4" />}
          onPress={onEnhancedToggle}
          isDisabled={loading}
        >
          {loading ? "Loading..." : "Enhanced View"}
        </Button>
      </div>

      {/* Info Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader>How Simple Crowding Works</ModalHeader>
          <ModalBody className="pb-6">
            <div className="space-y-4">
              <p className="text-sm">
                Simple crowding analysis estimates crowding based on train headways - the time between consecutive trains at major stations.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Chip size="sm" color="success" variant="flat">Low</Chip>
                  <span className="text-sm">Headway &lt; 6 minutes - frequent service</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip size="sm" color="warning" variant="flat">Medium</Chip>
                  <span className="text-sm">Headway 6-12 minutes - moderate wait times</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip size="sm" color="danger" variant="flat">High</Chip>
                  <span className="text-sm">Headway &gt; 12 minutes - long gaps, crowded trains</span>
                </div>
              </div>

              <div className="bg-primary/10 p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Want more detail?</p>
                <p className="text-xs text-foreground/70">
                  Try <strong>Enhanced View</strong> for multi-factor analysis including rush hour patterns, delays, and service alerts.
                </p>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Card className="bg-content2/50 border-none">
        <CardBody>
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p>Longer gaps between trains usually mean more crowded platforms and cars.</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {high.length > 0 && (
        <RouteSection title="High Crowding / Delays" routes={high} level="HIGH" />
      )}
      {medium.length > 0 && (
        <RouteSection title="Moderate Crowding" routes={medium} level="MEDIUM" />
      )}
      {low.length > 0 && (
        <RouteSection title="Good Service / Low Crowding" routes={low} level="LOW" />
      )}
    </div>
  );
}

function RouteSection({ title, routes, level }: { title: string; routes: RouteCrowding[]; level: CrowdingLevel }) {
  const color = getLevelColor(level);
  const label = level === "HIGH" ? "Packed" : level === "MEDIUM" ? "Busy" : "Clear";

  return (
    <section>
      <h2 className={`text-xl font-semibold mb-4 text-${color}`}>{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routes.map((item) => (
          <Card key={item.routeId} className={`border-${color}/20`}>
            <CardBody className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <SubwayBullet line={item.routeId} />
                <div>
                  <p className="font-medium">~{item.avgHeadwayMin} min gaps</p>
                  <p className="text-xs text-foreground/50">Avg headway</p>
                </div>
              </div>
              <Chip color={color} variant="flat" size="sm">{label}</Chip>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}

function getLevelColor(level: CrowdingLevel): "success" | "warning" | "danger" {
  if (level === "LOW") return "success";
  if (level === "MEDIUM") return "warning";
  return "danger";
}
