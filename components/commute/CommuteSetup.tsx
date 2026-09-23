"use client";

import { useState } from "react";
import { Button, Input, Switch } from "@heroui/react";
import { AlertCircle, ArrowDownUp, CheckCircle2, Clock, Save, Star, Tag } from "lucide-react";

import { LocationSearchField, Surface } from "@/components/ui";
import type { LocationSearchResult } from "@/types/location";

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

function initialLocation(
  prefix: "from" | "to",
  data?: CommuteData,
): LocationSearchResult | null {
  const name = prefix === "from" ? data?.fromAddress : data?.toAddress;
  const latitude = prefix === "from" ? data?.fromLat : data?.toLat;
  const longitude = prefix === "from" ? data?.fromLon : data?.toLon;
  if (!name || latitude == null || longitude == null) return null;
  return { id: `commute-${prefix}`, kind: "place", name, description: name, latitude, longitude };
}

export function CommuteSetup({ initialData, onSave, onCancel, isNew }: CommuteSetupProps) {
  const [label, setLabel] = useState(initialData?.label ?? "My Commute");
  const [fromLocation, setFromLocation] = useState<LocationSearchResult | null>(() => initialLocation("from", initialData));
  const [toLocation, setToLocation] = useState<LocationSearchResult | null>(() => initialLocation("to", initialData));
  const [targetArrival, setTargetArrival] = useState(initialData?.targetArrival ?? "09:00");
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!fromLocation || !toLocation) {
      setError("Select both locations from the search results.");
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
          label: label.trim(),
          fromAddress: fromLocation.name,
          fromLat: fromLocation.latitude,
          fromLon: fromLocation.longitude,
          toAddress: toLocation.name,
          toLat: toLocation.latitude,
          toLon: toLocation.longitude,
          targetArrival,
          isDefault,
        }),
      });
      const payload = await response.json() as { success: boolean; data?: { commute: CommuteData }; error?: string };
      if (response.ok === false || !payload.success || !payload.data) throw new Error(payload.error ?? "Commute could not be saved.");
      setSuccess(true);
      onSave(payload.data.commute);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Commute could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Surface as="section" className="space-y-5 p-4 sm:p-6">
      <header>
        <h2 className="text-xl font-bold text-foreground">{isNew ? "Add New Commute" : "Edit Commute"}</h2>
        <p className="mt-1 text-sm text-foreground/60">Save a repeat trip for quicker departure decisions.</p>
      </header>

      <Input label="Commute Name" placeholder="e.g., Morning Commute, Work → Home..." value={label} onValueChange={setLabel} startContent={<Tag className="h-4 w-4" aria-hidden="true" />} />

      <LocationSearchField label="From" placeholder="Enter starting address..." value={fromLocation} onSelect={(location) => { setFromLocation(location); setError(null); }} />
      {fromLocation && <p className="flex items-center gap-1 text-xs text-state-normal"><CheckCircle2 className="h-3 w-3" aria-hidden="true" />Location confirmed</p>}

      <div className="flex justify-center">
        <button type="button" aria-label="Swap commute locations" disabled={!fromLocation && !toLocation} onClick={() => { setFromLocation(toLocation); setToLocation(fromLocation); }} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40">
          <ArrowDownUp className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <LocationSearchField label="To" placeholder="Enter destination address..." value={toLocation} onSelect={(location) => { setToLocation(location); setError(null); }} />
      {toLocation && <p className="flex items-center gap-1 text-xs text-state-normal"><CheckCircle2 className="h-3 w-3" aria-hidden="true" />Location confirmed</p>}

      <Input type="time" label="Target Arrival Time" value={targetArrival} onValueChange={setTargetArrival} startContent={<Clock className="h-4 w-4" aria-hidden="true" />} className="max-w-56" />

      <div className="flex min-h-11 items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 text-sm"><Star className="h-4 w-4 text-state-advisory" aria-hidden="true" />Show on dashboard</span>
        <Switch aria-label="Show on dashboard" isSelected={isDefault} onValueChange={setIsDefault} size="sm" />
      </div>

      {error && <p role="alert" className="flex items-center gap-2 rounded-lg bg-state-severe/10 px-3 py-2 text-sm text-state-severe"><AlertCircle className="h-4 w-4" aria-hidden="true" />{error}</p>}
      {success && <p role="status" className="flex items-center gap-2 text-sm text-state-normal"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Commute saved.</p>}

      <div className="flex gap-2">
        {onCancel && <Button variant="flat" onPress={onCancel} className="flex-1">Cancel</Button>}
        <Button color="primary" onPress={() => void handleSave()} isLoading={isSaving} isDisabled={!fromLocation || !toLocation || !label.trim() || isSaving} startContent={!isSaving && <Save className="h-4 w-4" aria-hidden="true" />} className="flex-1">Save Commute</Button>
      </div>
    </Surface>
  );
}
