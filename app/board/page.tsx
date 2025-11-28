"use client";

import { Tabs, Tab, Card, CardBody } from "@heroui/react";
import { Train, Bus } from "lucide-react";
import { StationBoard, NearbyStations } from "@/components/board";
import { useStationPreferences } from "@/lib/hooks/useStationPreferences";

export default function BoardPage() {
  const { addFavorite, isFavorite } = useStationPreferences();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Station Board</h1>
        <p className="mt-1 text-foreground/70">
          View upcoming departures at your favorite stations
        </p>
      </div>

      {/* Tabs for Subway/Bus */}
      <Tabs
        aria-label="Transit type"
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-6",
          cursor: "w-full bg-primary",
          tab: "max-w-fit px-0 h-12",
        }}
      >
        <Tab
          key="subway"
          title={
            <div className="flex items-center gap-2">
              <Train className="h-4 w-4" />
              <span>Subway</span>
            </div>
          }
        >
          <div className="mt-6 space-y-6">
            {/* Main Station Board */}
            <StationBoard autoRefresh={true} refreshInterval={30} />

            {/* Nearby Stations */}
            <NearbyStations
              onStationSelect={() => {
                // Could scroll to board or trigger selection
                // For now, this is a placeholder for future functionality
              }}
              onFavorite={(stationId, stationName) => addFavorite(stationId, stationName)}
              isFavorite={isFavorite}
              defaultCollapsed={true}
              radiusMiles={1}
              maxStations={5}
            />
          </div>
        </Tab>

        <Tab
          key="bus"
          title={
            <div className="flex items-center gap-2">
              <Bus className="h-4 w-4" />
              <span>Buses</span>
            </div>
          }
        >
          <Card className="mt-6">
            <CardBody className="py-12 text-center">
              <Bus className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Bus Support Coming Soon
              </h3>
              <p className="text-foreground/60 max-w-md mx-auto">
                We&apos;re working on adding real-time bus arrivals. In the meantime,
                check out the subway board for train times.
              </p>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
}
