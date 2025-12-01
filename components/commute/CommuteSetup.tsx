"use client";

/**
 * CommuteSetup Component
 * 
 * Form for configuring commute with from/to addresses,
 * geocoding, target arrival time, and custom labels.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Spinner,
  Listbox,
  ListboxItem,
  Divider,
  Switch,
} from "@heroui/react";
import {
  MapPin,
  Clock,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Tag,
  Star,
} from "lucide-react";

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
    postcode?: string;
  };
}

interface LocationInput {
  address: string;
  lat: number | null;
  lon: number | null;
}

export interface CommuteData {
  id?: string;
  label: string;
  fromAddress: string | null;
  fromLat: number | null;
  fromLon: number | null;
  toAddress: string | null;
  toLat: number | null;
  toLon: number | null;
  targetArrival: string | null;
  isDefault: boolean;
}

interface CommuteSetupProps {
  initialData?: CommuteData;
  onSave: (commute: CommuteData) => void;
  onCancel?: () => void;
  isNew?: boolean;
}

// Format address for cleaner display
function formatAddressDisplay(result: GeocodingResult): string {
  const addr = result.address;
  if (!addr) return result.display_name.split(",").slice(0, 3).join(", ");
  
  const parts: string[] = [];
  
  if (addr.house_number && addr.road) {
    parts.push(`${addr.house_number} ${addr.road}`);
  } else if (addr.road) {
    parts.push(addr.road);
  }
  
  if (addr.neighbourhood) {
    parts.push(addr.neighbourhood);
  } else if (addr.suburb) {
    parts.push(addr.suburb);
  }
  
  if (addr.borough) {
    parts.push(addr.borough);
  } else if (addr.city && addr.city !== "New York") {
    parts.push(addr.city);
  }
  
  return parts.length > 0 ? parts.join(", ") : result.display_name.split(",").slice(0, 2).join(", ");
}

export function CommuteSetup({ initialData, onSave, onCancel, isNew }: CommuteSetupProps) {
  // Label
  const [label, setLabel] = useState(initialData?.label || "My Commute");
  
  // Location state
  const [fromLocation, setFromLocation] = useState<LocationInput>({
    address: initialData?.fromAddress || "",
    lat: initialData?.fromLat ?? null,
    lon: initialData?.fromLon ?? null,
  });
  const [toLocation, setToLocation] = useState<LocationInput>({
    address: initialData?.toAddress || "",
    lat: initialData?.toLat ?? null,
    lon: initialData?.toLon ?? null,
  });
  
  // Target arrival time (HH:MM in 24h format)
  const [targetArrival, setTargetArrival] = useState(
    initialData?.targetArrival || "09:00"
  );
  
  // Default commute
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);
  
  // Suggestion state
  const [fromSuggestions, setFromSuggestions] = useState<GeocodingResult[]>([]);
  const [toSuggestions, setToSuggestions] = useState<GeocodingResult[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  
  // Loading state
  const [isGeocodingFrom, setIsGeocodingFrom] = useState(false);
  const [isGeocodingTo, setIsGeocodingTo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Refs
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

  // Geocode address using Nominatim
  const geocodeAddress = async (query: string): Promise<GeocodingResult[]> => {
    if (query.length < 3) return [];
    
    try {
      const searchQuery = query.toLowerCase().includes("ny") || query.toLowerCase().includes("new york")
        ? query
        : `${query}, New York, NY`;
      
      const params = new URLSearchParams({
        q: searchQuery,
        format: "json",
        addressdetails: "1",
        limit: "5",
        countrycodes: "us",
        viewbox: "-74.3,40.4,-73.6,41.0",
        bounded: "1",
      });
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "User-Agent": "NYC-Transit-Hub/1.0" } }
      );
      
      if (!response.ok) throw new Error("Geocoding failed");
      return await response.json();
    } catch (err) {
      console.error("Geocoding error:", err);
      return [];
    }
  };

  const handleFromAddressChange = useCallback((value: string) => {
    setFromLocation({ address: value, lat: null, lon: null });
    setError(null);
    setSuccess(false);
    
    if (debounceTimerFrom.current) clearTimeout(debounceTimerFrom.current);
    
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
    setSuccess(false);
    
    if (debounceTimerTo.current) clearTimeout(debounceTimerTo.current);
    
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
      lon: parseFloat(suggestion.lon),
    });
    setShowFromSuggestions(false);
  };

  const selectToSuggestion = (suggestion: GeocodingResult) => {
    setToLocation({
      address: formatAddressDisplay(suggestion),
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon),
    });
    setShowToSuggestions(false);
  };

  const handleSwapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const handleSave = async () => {
    // Validate
    if (!fromLocation.lat || !fromLocation.lon) {
      setError("Please select a 'from' address from the suggestions");
      return;
    }
    if (!toLocation.lat || !toLocation.lon) {
      setError("Please select a 'to' address from the suggestions");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/commute/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          label,
          fromAddress: fromLocation.address,
          fromLat: fromLocation.lat,
          fromLon: fromLocation.lon,
          toAddress: toLocation.address,
          toLat: toLocation.lat,
          toLon: toLocation.lon,
          targetArrival,
          isDefault,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to save commute");
        return;
      }

      setSuccess(true);
      onSave(data.data.commute);
      
      // Clear success message after a few seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save commute");
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = fromLocation.lat !== null && toLocation.lat !== null && label.trim().length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-1 pb-2">
        <h3 className="text-lg font-semibold">
          {isNew ? "Add New Commute" : "Edit Commute"}
        </h3>
        <p className="text-sm text-foreground/60">
          Configure your commute route with from/to addresses
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        {/* Label */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground/70 mb-1.5">
            <Tag className="h-4 w-4 text-primary" />
            Commute Name
          </label>
          <Input
            placeholder="e.g., Morning Commute, Work → Home..."
            value={label}
            onValueChange={setLabel}
          />
        </div>

        <Divider />

        {/* From Address */}
        <div className="relative" ref={fromRef}>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground/70 mb-1.5">
            <MapPin className="h-4 w-4 text-success" />
            From
          </label>
          <Input
            placeholder="Enter starting address..."
            value={fromLocation.address}
            onValueChange={handleFromAddressChange}
            onFocus={() => fromSuggestions.length > 0 && setShowFromSuggestions(true)}
            endContent={isGeocodingFrom ? <Spinner size="sm" /> : null}
            classNames={{
              inputWrapper: fromLocation.lat ? "border-success" : undefined,
            }}
          />
          {fromLocation.lat && (
            <span className="text-xs text-success mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Location confirmed
            </span>
          )}
          
          {showFromSuggestions && fromSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-content1 border border-default-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              <Listbox
                aria-label="From address suggestions"
                onAction={(key) => {
                  const suggestion = fromSuggestions[parseInt(key as string)];
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
        <div className="flex justify-center">
          <Button
            isIconOnly
            variant="flat"
            size="sm"
            onPress={handleSwapLocations}
            isDisabled={!fromLocation.address && !toLocation.address}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* To Address */}
        <div className="relative" ref={toRef}>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground/70 mb-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            To
          </label>
          <Input
            placeholder="Enter destination address..."
            value={toLocation.address}
            onValueChange={handleToAddressChange}
            onFocus={() => toSuggestions.length > 0 && setShowToSuggestions(true)}
            endContent={isGeocodingTo ? <Spinner size="sm" /> : null}
            classNames={{
              inputWrapper: toLocation.lat ? "border-success" : undefined,
            }}
          />
          {toLocation.lat && (
            <span className="text-xs text-success mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Location confirmed
            </span>
          )}
          
          {showToSuggestions && toSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-content1 border border-default-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              <Listbox
                aria-label="To address suggestions"
                onAction={(key) => {
                  const suggestion = toSuggestions[parseInt(key as string)];
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

        <Divider />

        {/* Target Arrival Time */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground/70 mb-1.5">
            <Clock className="h-4 w-4 text-warning" />
            Target Arrival Time
          </label>
          <Input
            type="time"
            value={targetArrival}
            onValueChange={setTargetArrival}
            description="When do you need to arrive?"
            classNames={{
              input: "text-center",
              base: "max-w-[150px]",
            }}
          />
        </div>

        {/* Default commute toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-warning" />
            <span className="text-sm">Show on dashboard</span>
          </div>
          <Switch
            isSelected={isDefault}
            onValueChange={setIsDefault}
            size="sm"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Commute saved successfully!</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="flat"
              onPress={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={isSaving}
            isDisabled={!canSave || isSaving}
            startContent={!isSaving && <Save className="h-4 w-4" />}
            className="flex-1"
          >
            {isSaving ? "Saving..." : "Save Commute"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
