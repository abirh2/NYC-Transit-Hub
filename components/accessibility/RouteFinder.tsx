"use client";

import { useState, useCallback } from "react";
import { Card, CardBody, Button, Switch, Spinner } from "@heroui/react";
import { 
  MapPin, 
  Navigation, 
  ArrowRight, 
  Accessibility, 
  RotateCcw,
  Search 
} from "lucide-react";
import { StationSearch } from "@/components/board";
import type { AccessibleRouteResponse } from "@/types/api";

interface RouteFinderProps {
  onRouteFound: (route: AccessibleRouteResponse | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function RouteFinder({ 
  onRouteFound, 
  isLoading, 
  setIsLoading 
}: RouteFinderProps) {
  const [fromStation, setFromStation] = useState<{
    id: string;
    name: string;
    allPlatforms?: { north: string[]; south: string[] };
  } | null>(null);
  
  const [toStation, setToStation] = useState<{
    id: string;
    name: string;
    allPlatforms?: { north: string[]; south: string[] };
  } | null>(null);
  
  const [requireAccessible, setRequireAccessible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleFromSelect = useCallback((
    id: string, 
    name: string, 
    allPlatforms?: { north: string[]; south: string[] }
  ) => {
    setFromStation({ id, name, allPlatforms });
    setError(null);
  }, []);

  const handleToSelect = useCallback((
    id: string, 
    name: string, 
    allPlatforms?: { north: string[]; south: string[] }
  ) => {
    setToStation({ id, name, allPlatforms });
    setError(null);
  }, []);

  const handleSwapStations = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  const handleFindRoute = async () => {
    if (!fromStation || !toStation) {
      setError("Please select both origin and destination stations");
      return;
    }

    if (fromStation.id === toStation.id) {
      setError("Origin and destination cannot be the same station");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        from: fromStation.id,
        to: toStation.id,
      });
      
      if (requireAccessible) {
        params.set("requireAccessible", "true");
      }

      const response = await fetch(`/api/routes/accessible?${params}`);
      const data = await response.json();

      if (data.success) {
        onRouteFound(data.data);
        
        if (!data.data.primary && requireAccessible) {
          setError("No fully accessible route found. Try disabling 'Accessible only' to see all routes.");
        }
      } else {
        setError(data.error || "Failed to find route");
        onRouteFound(null);
      }
    } catch (err) {
      console.error("Failed to find route:", err);
      setError(err instanceof Error ? err.message : "Failed to find route");
      onRouteFound(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFromStation(null);
    setToStation(null);
    setError(null);
    onRouteFound(null);
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Navigation className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Find Accessible Route</h3>
        </div>

        {/* Station Selectors */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
          {/* From Station */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
              <MapPin className="h-3.5 w-3.5 inline mr-1" />
              From
            </label>
            <StationSearch
              onSelect={handleFromSelect}
              selectedId={fromStation?.id}
              placeholder="Search origin station..."
            />
          </div>

          {/* Swap Button */}
          <Button
            isIconOnly
            variant="flat"
            size="lg"
            onPress={handleSwapStations}
            className="self-center lg:mb-0.5"
            isDisabled={!fromStation && !toStation}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* To Station */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
              <MapPin className="h-3.5 w-3.5 inline mr-1" />
              To
            </label>
            <StationSearch
              onSelect={handleToSelect}
              selectedId={toStation?.id}
              placeholder="Search destination station..."
            />
          </div>
        </div>

        {/* Selected Stations Display */}
        {(fromStation || toStation) && (
          <div className="flex items-center gap-3 px-3 py-2 bg-default-50 rounded-lg text-sm">
            <span className={fromStation ? "text-foreground" : "text-foreground/40"}>
              {fromStation?.name || "Select origin"}
            </span>
            <ArrowRight className="h-4 w-4 text-foreground/40" />
            <span className={toStation ? "text-foreground" : "text-foreground/40"}>
              {toStation?.name || "Select destination"}
            </span>
          </div>
        )}

        {/* Options and Actions */}
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {/* Accessible Only Toggle */}
          <div className="flex items-center gap-3 px-3 py-2 bg-default-100 rounded-lg">
            <Switch
              size="sm"
              isSelected={requireAccessible}
              onValueChange={setRequireAccessible}
              color="primary"
            />
            <div className="flex items-center gap-1.5">
              <Accessibility className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Accessible only</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {(fromStation || toStation) && (
              <Button
                size="md"
                variant="flat"
                onPress={handleClear}
              >
                Clear
              </Button>
            )}
            <Button
              size="md"
              color="primary"
              onPress={handleFindRoute}
              isDisabled={!fromStation || !toStation || isLoading}
              startContent={isLoading ? <Spinner size="sm" color="current" /> : <Search className="h-4 w-4" />}
            >
              {isLoading ? "Finding..." : "Find Route"}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

