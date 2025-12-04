"use client";

import { Tabs, Tab } from "@heroui/react";
import { Train, Bus, TrainFront } from "lucide-react";
import { 
  StationBoard, 
  NearbyStations, 
  RailStationBoard,
  BusStopBoard,
} from "@/components/board";
import { useStationPreferences } from "@/lib/hooks/useStationPreferences";

export default function BoardPage() {
  const { addFavorite, removeFavorite, isFavorite, favorites } = useStationPreferences();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Station Board</h1>
        <p className="mt-1 text-foreground/70">
          View upcoming departures at your favorite stations
        </p>
      </div>

      {/* Tabs for different transit modes */}
      <Tabs
        aria-label="Transit type"
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-4 flex-wrap",
          cursor: "w-full bg-primary",
          tab: "max-w-fit px-0 h-12",
        }}
      >
        {/* Subway Tab */}
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
                // Future: scroll to board or trigger selection
              }}
              onFavorite={(stationId, stationName) => addFavorite(stationId, stationName)}
              isFavorite={isFavorite}
              defaultCollapsed={true}
              radiusMiles={1}
              maxStations={5}
            />
          </div>
        </Tab>

        {/* LIRR Tab */}
        <Tab
          key="lirr"
          title={
            <div className="flex items-center gap-2">
              <TrainFront className="h-4 w-4" />
              <span>LIRR</span>
            </div>
          }
        >
          <div className="mt-6">
            <RailStationBoard
              mode="lirr"
              autoRefresh={true}
              refreshInterval={30}
              onFavorite={(stationId, stationName) => addFavorite(`lirr-${stationId}`, stationName)}
              onUnfavorite={(stationId) => removeFavorite(`lirr-${stationId}`)}
              isFavorite={(stationId) => isFavorite(`lirr-${stationId}`)}
              favoriteIds={favorites
                .filter(f => f.stationId.startsWith("lirr-"))
                .map(f => f.stationId.replace("lirr-", ""))
              }
            />
          </div>
        </Tab>

        {/* Metro-North Tab */}
        <Tab
          key="metro-north"
          title={
            <div className="flex items-center gap-2">
              <TrainFront className="h-4 w-4" />
              <span>Metro-North</span>
            </div>
          }
        >
          <div className="mt-6">
            <RailStationBoard
              mode="metro-north"
              autoRefresh={true}
              refreshInterval={30}
              onFavorite={(stationId, stationName) => addFavorite(`mnr-${stationId}`, stationName)}
              onUnfavorite={(stationId) => removeFavorite(`mnr-${stationId}`)}
              isFavorite={(stationId) => isFavorite(`mnr-${stationId}`)}
              favoriteIds={favorites
                .filter(f => f.stationId.startsWith("mnr-"))
                .map(f => f.stationId.replace("mnr-", ""))
              }
            />
          </div>
        </Tab>

        {/* Bus Tab */}
        <Tab
          key="bus"
          title={
            <div className="flex items-center gap-2">
              <Bus className="h-4 w-4" />
              <span>Buses</span>
            </div>
          }
        >
          <div className="mt-6">
            <BusStopBoard
              autoRefresh={true}
              refreshInterval={30}
              maxDistanceMiles={0.5}
            />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
