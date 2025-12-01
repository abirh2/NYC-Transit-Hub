"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardBody, Button, Input, Switch, Spinner, Listbox, ListboxItem, Chip, Divider } from "@heroui/react";
import { 
  MapPin, 
  Navigation, 
  ArrowRight, 
  Accessibility, 
  RotateCcw,
  Search,
  Clock,
  Footprints,
  AlertCircle
} from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import { format } from "date-fns";

interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    borough?: string;
    state?: string;
    postcode?: string;
  };
  type?: string;
  class?: string;
}

// Format address for cleaner display
function formatAddressDisplay(result: GeocodingResult): string {
  const addr = result.address;
  if (!addr) return result.display_name.split(",").slice(0, 3).join(", ");
  
  const parts: string[] = [];
  
  // Street address
  if (addr.house_number && addr.road) {
    parts.push(`${addr.house_number} ${addr.road}`);
  } else if (addr.road) {
    parts.push(addr.road);
  }
  
  // Neighborhood or suburb
  if (addr.neighbourhood) {
    parts.push(addr.neighbourhood);
  } else if (addr.suburb) {
    parts.push(addr.suburb);
  }
  
  // Borough (for NYC)
  if (addr.borough) {
    parts.push(addr.borough);
  } else if (addr.city && addr.city !== "New York") {
    parts.push(addr.city);
  }
  
  return parts.length > 0 ? parts.join(", ") : result.display_name.split(",").slice(0, 2).join(", ");
}

interface LocationInput {
  address: string;
  lat: number | null;
  lon: number | null;
}

interface OTPLeg {
  startTime: number;
  startTimeFmt: string;
  endTime: number;
  endTimeFmt: string;
  mode: "WALK" | "BUS" | "SUBWAY" | "TRAM" | "RAIL" | "FERRY";
  route?: string;
  routeColor?: string;
  headsign?: string;
  tripHeadsign?: string;
  duration: number;
  distance: number;
  from: { name: string; lon: number; lat: number };
  to: { name: string; lon: number; lat: number };
  intermediateStops?: Array<{ name: string }>;
  steps?: Array<{ instructionText?: string; distance: number }>;
  transitLeg: boolean;
}

interface OTPItinerary {
  duration: number;
  startTimeFmt: string;
  endTimeFmt: string;
  walkTime: number;
  transitTime: number;
  walkDistance: number;
  transfers: number;
  legs: OTPLeg[];
}

interface TripResponse {
  success: boolean;
  error?: string;
  noPath?: boolean;
  data?: {
    from: { name: string };
    to: { name: string };
    itineraries: OTPItinerary[];
    wheelchair: boolean;
  };
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return format(date, "h:mm a");
  } catch {
    return isoString;
  }
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters)} ft`;
  return `${miles.toFixed(1)} mi`;
}

// Subway lines that should use the bullet icon
const SUBWAY_LINES = new Set([
  "1", "2", "3", "4", "5", "6", "7",
  "A", "B", "C", "D", "E", "F", "G",
  "J", "L", "M", "N", "Q", "R", "S", "W", "Z",
  "SI", "SIR", "FS", "GS", "6X", "7X"
]);

function isSubwayLine(route: string | undefined): boolean {
  if (!route) return false;
  return SUBWAY_LINES.has(route.toUpperCase());
}

function getLineColor(leg: OTPLeg): string {
  if (leg.routeColor) return `#${leg.routeColor}`;
  
  // Subway line colors
  const colors: Record<string, string> = {
    "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
    "4": "#00933C", "5": "#00933C", "6": "#00933C",
    "7": "#B933AD", "7X": "#B933AD",
    "A": "#0039A6", "C": "#0039A6", "E": "#0039A6",
    "B": "#FF6319", "D": "#FF6319", "F": "#FF6319", "M": "#FF6319",
    "G": "#6CBE45",
    "J": "#996633", "Z": "#996633",
    "L": "#A7A9AC",
    "N": "#FCCC0A", "Q": "#FCCC0A", "R": "#FCCC0A", "W": "#FCCC0A",
    "S": "#808183", "SI": "#0039A6", "SIR": "#0039A6",
    // Metro-North
    "HARLEM": "#0039A6", "HUDSON": "#0039A6", "NEW HAVEN": "#0039A6",
    // LIRR - blue
    "LIRR": "#0039A6"
  };
  
  return colors[leg.route?.toUpperCase() || ""] || "#808183";
}

// Render transit line badge - subway bullet or chip for commuter rail
function TransitBadge({ leg, size = "md" }: { leg: OTPLeg; size?: "sm" | "md" }) {
  const route = leg.route || "";
  
  if (isSubwayLine(route)) {
    return <SubwayBullet line={route} size={size} />;
  }
  
  // For commuter rail and buses, use a chip
  const color = getLineColor(leg);
  const displayName = route.length > 8 ? route.slice(0, 3).toUpperCase() : route;
  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";
  
  return (
    <span 
      className={`${sizeClasses} rounded font-semibold text-white`}
      style={{ backgroundColor: color }}
    >
      {displayName}
    </span>
  );
}

function ItineraryCard({ itinerary, index, isAccessible }: { itinerary: OTPItinerary; index: number; isAccessible: boolean }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);
  
  // Get transit legs for preview
  const transitLegs = itinerary.legs.filter(l => l.transitLeg);
  
  return (
    <Card className={index === 0 ? "border-2 border-primary" : "border border-default-200"}>
      <CardBody className="py-4 px-5">
        {/* Header - Click to expand/collapse */}
        <button 
          className="w-full text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Time range */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-success">
                  {formatTime(itinerary.startTimeFmt)}
                </span>
                <ArrowRight className="h-4 w-4 text-foreground/40" />
                <span className="font-semibold text-foreground">
                  {formatTime(itinerary.endTimeFmt)}
                </span>
              </div>
              
              {/* Duration */}
              <div className="flex items-center gap-1.5 text-foreground/70">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{formatDuration(itinerary.duration)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Route preview icons */}
              <div className="flex items-center gap-1">
                {transitLegs.map((leg, i) => (
                  <div key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-foreground/30 text-xs mx-0.5">→</span>}
                    <TransitBadge leg={leg} size="sm" />
                  </div>
                ))}
              </div>
              
              {isAccessible && (
                <Accessibility className="h-4 w-4 text-success" />
              )}
            </div>
          </div>
        </button>
        
        {/* Expanded Timeline */}
        {isExpanded && (
          <div className="mt-5">
            {itinerary.legs.map((leg, legIndex) => {
              const isWalk = !leg.transitLeg;
              const lineColor = getLineColor(leg);
              const prevLeg = legIndex > 0 ? itinerary.legs[legIndex - 1] : null;
              const prevWasTransit = prevLeg && prevLeg.transitLeg;
              const prevLineColor = prevLeg ? getLineColor(prevLeg) : null;
              const stopCount = leg.intermediateStops?.length || 0;
              
              // Dot color logic:
              // - First stop: dark border
              // - Start of transit leg: use that transit's color
              // - After transit leg (walk): use previous transit's color
              const dotColor = legIndex === 0 
                ? undefined 
                : !isWalk 
                  ? lineColor 
                  : prevWasTransit 
                    ? prevLineColor 
                    : undefined;
              
              return (
                <div key={legIndex} className="flex">
                  {/* Time column */}
                  <div className="w-16 shrink-0 text-right pr-4">
                    <span className="text-sm font-medium text-foreground/70">
                      {formatTime(leg.startTimeFmt)}
                    </span>
                  </div>
                  
                  {/* Timeline column */}
                  <div className="flex flex-col items-center w-6 shrink-0">
                    {/* Station dot */}
                    <div 
                      className={`w-3.5 h-3.5 rounded-full border-2 bg-background shrink-0 ${
                        legIndex === 0 ? "border-foreground" : !dotColor ? "border-foreground/40" : ""
                      }`}
                      style={dotColor ? { borderColor: dotColor } : undefined}
                    />
                    
                    {/* Connecting line */}
                    <div 
                      className={`w-1 flex-1 min-h-12 ${isWalk ? "border-l-2 border-dashed border-primary/50" : ""}`}
                      style={!isWalk ? { backgroundColor: lineColor } : undefined}
                    />
                  </div>
                  
                  {/* Content column */}
                  <div className="flex-1 pl-3 pb-2">
                    {/* Station name */}
                    <p className="font-semibold text-foreground leading-tight">
                      {leg.from.name}
                    </p>
                    {legIndex === 0 && (
                      <p className="text-xs text-foreground/50 mt-0.5">Origin</p>
                    )}
                    
                    {/* Leg info */}
                    <div className="mt-3 mb-3">
                      {isWalk ? (
                        <div className="flex items-center gap-2 text-foreground/60">
                          <Footprints className="h-4 w-4" />
                          <span className="text-sm">Walk</span>
                          <span className="text-xs text-foreground/40">
                            About {formatDuration(leg.duration)}, {formatDistance(leg.distance)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <TransitBadge leg={leg} size="md" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {leg.headsign || leg.tripHeadsign || ""}
                            </p>
                            {stopCount > 0 && (
                              <p className="text-xs text-foreground/50">
                                {formatDuration(leg.duration)} ({stopCount} stop{stopCount !== 1 ? "s" : ""})
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Final destination */}
            {(() => {
              // Find the last transit leg to get its color for the final dot
              const lastLeg = itinerary.legs[itinerary.legs.length - 1];
              const lastTransitLeg = [...itinerary.legs].reverse().find(l => l.transitLeg);
              const finalDotColor = lastTransitLeg ? getLineColor(lastTransitLeg) : undefined;
              
              return (
                <div className="flex">
                  {/* Time column */}
                  <div className="w-16 shrink-0 text-right pr-4">
                    <span className="text-sm font-medium text-foreground/70">
                      {formatTime(itinerary.endTimeFmt)}
                    </span>
                  </div>
                  
                  {/* Timeline column */}
                  <div className="flex flex-col items-center w-6 shrink-0">
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: finalDotColor || 'currentColor' }}
                    >
                      <div className="w-2 h-2 rounded-full bg-background" />
                    </div>
                  </div>
                  
                  {/* Content column */}
                  <div className="flex-1 pl-3">
                    <p className="font-semibold text-foreground">
                      {lastLeg?.to.name || "Destination"}
                    </p>
                    <p className="text-xs text-foreground/50 mt-0.5">Destination</p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function RouteFinder() {
  const [fromLocation, setFromLocation] = useState<LocationInput>({
    address: "",
    lat: null,
    lon: null
  });
  const [toLocation, setToLocation] = useState<LocationInput>({
    address: "",
    lat: null,
    lon: null
  });
  
  const [fromSuggestions, setFromSuggestions] = useState<GeocodingResult[]>([]);
  const [toSuggestions, setToSuggestions] = useState<GeocodingResult[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  
  const [requireAccessible, setRequireAccessible] = useState(true);
  const [isGeocodingFrom, setIsGeocodingFrom] = useState(false);
  const [isGeocodingTo, setIsGeocodingTo] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripResults, setTripResults] = useState<TripResponse | null>(null);
  
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const debounceTimerFrom = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerTo = useRef<NodeJS.Timeout | null>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fromRef.current && !fromRef.current.contains(event.target as Node)) {
        setShowFromSuggestions(false);
      }
      if (toRef.current && !toRef.current.contains(event.target as Node)) {
        setShowToSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Geocode address using Nominatim (free OpenStreetMap geocoding)
  const geocodeAddress = async (query: string): Promise<GeocodingResult[]> => {
    if (query.length < 3) return [];
    
    try {
      // Add "New York" to query if not present to bias results
      const searchQuery = query.toLowerCase().includes("ny") || query.toLowerCase().includes("new york")
        ? query
        : `${query}, New York, NY`;
      
      const params = new URLSearchParams({
        q: searchQuery,
        format: "json",
        addressdetails: "1",
        limit: "6",
        countrycodes: "us",
        viewbox: "-74.3,40.4,-73.6,41.0", // NYC bounding box
        bounded: "1"
      });
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            "User-Agent": "NYC-Transit-Hub/1.0"
          }
        }
      );
      
      if (!response.ok) throw new Error("Geocoding failed");
      const results: GeocodingResult[] = await response.json();
      
      // Sort to prioritize actual addresses over POIs
      return results.sort((a, b) => {
        const aIsAddress = a.class === "place" || a.class === "building" || (a.address?.house_number && a.address?.road);
        const bIsAddress = b.class === "place" || b.class === "building" || (b.address?.house_number && b.address?.road);
        if (aIsAddress && !bIsAddress) return -1;
        if (!aIsAddress && bIsAddress) return 1;
        return 0;
      });
    } catch (err) {
      console.error("Geocoding error:", err);
      return [];
    }
  };

  const handleFromAddressChange = useCallback((value: string) => {
    setFromLocation({ address: value, lat: null, lon: null });
    setError(null);
    setTripResults(null);
    
    if (debounceTimerFrom.current) {
      clearTimeout(debounceTimerFrom.current);
    }
    
    debounceTimerFrom.current = setTimeout(async () => {
      if (value.length >= 3) {
        setIsGeocodingFrom(true);
        const results = await geocodeAddress(value);
        setFromSuggestions(results);
        setShowFromSuggestions(results.length > 0);
        setIsGeocodingFrom(false);
      } else {
        setFromSuggestions([]);
        setShowFromSuggestions(false);
      }
    }, 300);
  }, []);

  const handleToAddressChange = useCallback((value: string) => {
    setToLocation({ address: value, lat: null, lon: null });
    setError(null);
    setTripResults(null);
    
    if (debounceTimerTo.current) {
      clearTimeout(debounceTimerTo.current);
    }
    
    debounceTimerTo.current = setTimeout(async () => {
      if (value.length >= 3) {
        setIsGeocodingTo(true);
        const results = await geocodeAddress(value);
        setToSuggestions(results);
        setShowToSuggestions(results.length > 0);
        setIsGeocodingTo(false);
      } else {
        setToSuggestions([]);
        setShowToSuggestions(false);
      }
    }, 300);
  }, []);

  const selectFromSuggestion = (suggestion: GeocodingResult) => {
    setFromLocation({
      address: formatAddressDisplay(suggestion),
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon)
    });
    setShowFromSuggestions(false);
  };

  const selectToSuggestion = (suggestion: GeocodingResult) => {
    setToLocation({
      address: formatAddressDisplay(suggestion),
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon)
    });
    setShowToSuggestions(false);
  };

  const handleSwapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
    setTripResults(null);
  };

  const handleFindRoute = async () => {
    if (!fromLocation.lat || !fromLocation.lon || !toLocation.lat || !toLocation.lon) {
      setError("Please select addresses from the suggestions to get coordinates");
      return;
    }

    setIsSearching(true);
    setError(null);
    setTripResults(null);

    try {
      const params = new URLSearchParams({
        fromLat: String(fromLocation.lat),
        fromLon: String(fromLocation.lon),
        toLat: String(toLocation.lat),
        toLon: String(toLocation.lon),
        wheelchair: String(requireAccessible),
        numItineraries: "3"
      });

      const response = await fetch(`/api/routes/trip?${params}`);
      const data: TripResponse = await response.json();

      setTripResults(data);

      if (!data.success) {
        setError(data.error || "Could not find a route");
      }
    } catch (err) {
      console.error("Trip planning error:", err);
      setError(err instanceof Error ? err.message : "Failed to plan trip");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setFromLocation({ address: "", lat: null, lon: null });
    setToLocation({ address: "", lat: null, lon: null });
    setFromSuggestions([]);
    setToSuggestions([]);
    setError(null);
    setTripResults(null);
  };

  const canSubmit = fromLocation.lat !== null && toLocation.lat !== null;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Plan Accessible Trip</h3>
          </div>

          <p className="text-sm text-foreground/60">
            Enter any address in NYC to find accessible transit routes.
          </p>

          {/* Address Inputs */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-start">
            {/* From Address */}
            <div className="flex-1 relative" ref={fromRef}>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                From
              </label>
              <Input
                placeholder="Enter origin address..."
                value={fromLocation.address}
                onValueChange={handleFromAddressChange}
                onFocus={() => fromSuggestions.length > 0 && setShowFromSuggestions(true)}
                endContent={isGeocodingFrom ? <Spinner size="sm" /> : null}
                classNames={{
                  input: "text-sm",
                  inputWrapper: fromLocation.lat ? "border-success" : undefined
                }}
              />
              {fromLocation.lat && (
                <span className="text-xs text-success mt-1 block">Location confirmed</span>
              )}
              
            {showFromSuggestions && fromSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-content1 border border-default-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                <Listbox
                  aria-label="Address suggestions"
                  onAction={(key) => {
                    const idx = parseInt(key as string);
                    const suggestion = fromSuggestions[idx];
                    if (suggestion) selectFromSuggestion(suggestion);
                  }}
                >
                  {fromSuggestions.map((suggestion, idx) => (
                    <ListboxItem key={idx} className="text-sm py-2">
                      <div>
                        <p className="font-medium">{formatAddressDisplay(suggestion)}</p>
                        {suggestion.address?.postcode && (
                          <p className="text-xs text-foreground/50">{suggestion.address.postcode}</p>
                        )}
                      </div>
                    </ListboxItem>
                  ))}
                </Listbox>
              </div>
            )}
            </div>

            {/* Swap Button */}
            <Button
              isIconOnly
              variant="flat"
              size="lg"
              onPress={handleSwapLocations}
              className="self-center lg:mt-7"
              isDisabled={!fromLocation.address && !toLocation.address}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            {/* To Address */}
            <div className="flex-1 relative" ref={toRef}>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                To
              </label>
              <Input
                placeholder="Enter destination address..."
                value={toLocation.address}
                onValueChange={handleToAddressChange}
                onFocus={() => toSuggestions.length > 0 && setShowToSuggestions(true)}
                endContent={isGeocodingTo ? <Spinner size="sm" /> : null}
                classNames={{
                  input: "text-sm",
                  inputWrapper: toLocation.lat ? "border-success" : undefined
                }}
              />
              {toLocation.lat && (
                <span className="text-xs text-success mt-1 block">Location confirmed</span>
              )}
              
            {showToSuggestions && toSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-content1 border border-default-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                <Listbox
                  aria-label="Address suggestions"
                  onAction={(key) => {
                    const idx = parseInt(key as string);
                    const suggestion = toSuggestions[idx];
                    if (suggestion) selectToSuggestion(suggestion);
                  }}
                >
                  {toSuggestions.map((suggestion, idx) => (
                    <ListboxItem key={idx} className="text-sm py-2">
                      <div>
                        <p className="font-medium">{formatAddressDisplay(suggestion)}</p>
                        {suggestion.address?.postcode && (
                          <p className="text-xs text-foreground/50">{suggestion.address.postcode}</p>
                        )}
                      </div>
                    </ListboxItem>
                  ))}
                </Listbox>
              </div>
            )}
            </div>
          </div>

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
                <span className="text-sm font-medium">Wheelchair accessible</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {(fromLocation.address || toLocation.address) && (
                <Button size="md" variant="flat" onPress={handleClear}>
                  Clear
                </Button>
              )}
              <Button
                size="md"
                color="primary"
                onPress={handleFindRoute}
                isDisabled={!canSubmit || isSearching}
                startContent={isSearching ? <Spinner size="sm" color="current" /> : <Search className="h-4 w-4" />}
              >
                {isSearching ? "Finding..." : "Find Route"}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Trip Results */}
      {tripResults?.success && tripResults.data && (
        <div className="space-y-4">
          <Divider />
          
          {/* Results header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h4 className="font-semibold text-foreground">
                {tripResults.data.itineraries.length} route{tripResults.data.itineraries.length !== 1 ? "s" : ""} found
              </h4>
              {tripResults.data.wheelchair && (
                <Chip size="sm" color="success" variant="flat" startContent={<Accessibility className="h-3 w-3" />}>
                  Accessible
                </Chip>
              )}
            </div>
          </div>
          
          {/* Itinerary cards */}
          <div className="space-y-3">
            {tripResults.data.itineraries.map((itinerary, idx) => (
              <ItineraryCard 
                key={idx} 
                itinerary={itinerary} 
                index={idx}
                isAccessible={tripResults.data!.wheelchair}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
