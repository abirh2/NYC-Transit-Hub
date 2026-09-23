"use client";

import { useState } from "react";

import { LocationSearchField } from "@/components/ui";
import type { LocationSearchResult } from "@/types/location";

interface NearbyLocationSearchProps {
  onSelect: (result: LocationSearchResult) => void;
}

export function NearbyLocationSearch({ onSelect }: NearbyLocationSearchProps) {
  const [value, setValue] = useState<LocationSearchResult | null>(null);

  return (
    <LocationSearchField
      label="Search location or station"
      value={value}
      onSelect={(result) => {
        setValue(result);
        if (result) onSelect(result);
      }}
      placement="above"
    />
  );
}
