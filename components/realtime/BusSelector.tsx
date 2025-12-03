"use client";

/**
 * BusSelector Component
 * 
 * Route picker for bus routes, organized by borough/prefix.
 * Supports searching and shows route groups.
 */

import { useState, useCallback, useMemo } from "react";
import { 
  Button, 
  Popover, 
  PopoverTrigger, 
  PopoverContent,
  Input,
  Spinner,
} from "@heroui/react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { BusBadge } from "@/components/ui/BusBadge";
import { 
  getAllRouteGroups, 
  getRouteGroupDisplayOrder,
  searchBusRoutes,
  type RouteGroupId,
} from "@/lib/gtfs/bus-routes";

interface BusSelectorProps {
  /** Currently selected route ID */
  selectedRoute: string | null;
  /** Callback when selection changes */
  onSelectionChange: (route: string | null) => void;
  /** Available routes (from API or static fallback) */
  availableRoutes?: string[];
  /** Whether routes are loading */
  isLoading?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export function BusSelector({
  selectedRoute,
  onSelectionChange,
  availableRoutes,
  isLoading = false,
  compact = false,
}: BusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const routeGroups = getAllRouteGroups();
  const groupOrder = getRouteGroupDisplayOrder();

  // Group available routes by prefix
  const groupedRoutes = useMemo(() => {
    const routes = availableRoutes ?? [];
    const grouped: Record<RouteGroupId, string[]> = {} as Record<RouteGroupId, string[]>;
    
    for (const groupId of groupOrder) {
      grouped[groupId] = [];
    }
    
    for (const route of routes) {
      const prefix = route.match(/^[A-Z]+/)?.[0] as RouteGroupId | undefined;
      if (prefix && grouped[prefix]) {
        grouped[prefix].push(route);
      }
    }
    
    return grouped;
  }, [availableRoutes, groupOrder]);

  // Filter routes by search query
  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return groupedRoutes;
    
    const results = searchBusRoutes(searchQuery, availableRoutes, 50);
    const filtered: Record<RouteGroupId, string[]> = {} as Record<RouteGroupId, string[]>;
    
    for (const groupId of groupOrder) {
      filtered[groupId] = [];
    }
    
    for (const route of results) {
      const prefix = route.match(/^[A-Z]+/)?.[0] as RouteGroupId | undefined;
      if (prefix && filtered[prefix]) {
        filtered[prefix].push(route);
      }
    }
    
    return filtered;
  }, [searchQuery, groupedRoutes, availableRoutes, groupOrder]);

  const selectRoute = useCallback((routeId: string) => {
    if (selectedRoute === routeId) {
      onSelectionChange(null);
    } else {
      onSelectionChange(routeId);
    }
    setIsOpen(false);
    setSearchQuery("");
  }, [selectedRoute, onSelectionChange]);

  const clearSelection = useCallback(() => {
    onSelectionChange(null);
    setSearchQuery("");
  }, [onSelectionChange]);

  // Count total filtered routes
  const totalFilteredRoutes = Object.values(filteredRoutes).reduce(
    (sum, routes) => sum + routes.length, 
    0
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Selected Route Display */}
      <div className="flex items-center gap-1.5">
        {selectedRoute ? (
          <div className="flex items-center gap-2">
            <BusBadge route={selectedRoute} size="md" />
            <span className="text-sm font-medium">{selectedRoute} Bus</span>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              className="h-5 w-5 min-w-5"
              onPress={clearSelection}
            >
              <X className="h-3 w-3 text-foreground/50" />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-foreground/50">No route selected</span>
        )}
      </div>

      {/* Route Picker Popover */}
      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom-start"
      >
        <PopoverTrigger>
          <Button
            size={compact ? "sm" : "md"}
            variant="flat"
            endContent={<ChevronDown className="h-4 w-4" />}
            isLoading={isLoading}
          >
            {selectedRoute ? "Change Route" : "Select Route"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0">
          {/* Search Header */}
          <div className="p-3 border-b border-divider">
            <Input
              placeholder="Search routes (e.g., M15, B44)"
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search className="h-4 w-4 text-foreground/50" />}
              endContent={
                searchQuery && (
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    className="h-5 w-5 min-w-5"
                    onPress={() => setSearchQuery("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )
              }
              size="sm"
              classNames={{
                inputWrapper: "h-9",
              }}
            />
          </div>

          {/* Routes List */}
          <div className="max-h-80 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
                <span className="ml-2 text-sm text-foreground/60">Loading routes...</span>
              </div>
            ) : totalFilteredRoutes === 0 ? (
              <div className="text-center py-8 text-foreground/50 text-sm">
                {searchQuery ? "No routes match your search" : "No routes available"}
              </div>
            ) : (
              groupOrder.map((groupId) => {
                const routes = filteredRoutes[groupId];
                if (!routes || routes.length === 0) return null;
                
                const groupInfo = routeGroups[groupId];
                
                return (
                  <div key={groupId} className="mb-3 last:mb-0">
                    {/* Group Header */}
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: groupInfo.color }}
                      />
                      <span className="text-xs font-medium text-foreground/70">
                        {groupInfo.name}
                      </span>
                      <span className="text-xs text-foreground/40">
                        ({routes.length})
                      </span>
                    </div>
                    
                    {/* Routes in Group */}
                    <div className="flex flex-wrap gap-1.5 px-2 mt-1">
                      {routes.map((routeId) => {
                        const isSelected = selectedRoute === routeId;
                        
                        return (
                          <button
                            key={routeId}
                            onClick={() => selectRoute(routeId)}
                            className={`
                              relative flex items-center justify-center p-1 rounded-lg transition-all
                              ${isSelected 
                                ? "ring-2 ring-primary ring-offset-1 ring-offset-background" 
                                : "hover:bg-default-100"
                              }
                              cursor-pointer
                            `}
                          >
                            <BusBadge route={routeId} size="sm" />
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-2.5 w-2.5 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

