"use client";

import { useState } from "react";
import { Button, Select, SelectItem, Chip, Input, Switch } from "@heroui/react";
import { X, RefreshCw, ArrowUpDown, Search } from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import type { SubwayLine, EquipmentType } from "@/types/mta";

// All subway lines for filtering
const SUBWAY_LINES: SubwayLine[] = [
  "1", "2", "3", "4", "5", "6", "7",
  "A", "C", "E", "B", "D", "F", "M",
  "G", "J", "Z", "L", "N", "Q", "R", "W", "S", "SIR"
];

// Equipment types
const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: "ELEVATOR", label: "Elevators" },
  { value: "ESCALATOR", label: "Escalators" },
];

// Sort options
export type OutageSortOption = "station" | "recent" | "return";

const SORT_OPTIONS: { value: OutageSortOption; label: string }[] = [
  { value: "station", label: "Station Name" },
  { value: "recent", label: "Most Recent" },
  { value: "return", label: "Return Date" },
];

export type OutageTab = "current" | "upcoming";

export interface OutageFiltersState {
  stationSearch: string;
  lines: string[];
  equipmentTypes: EquipmentType[];
  adaOnly: boolean;
  sortBy: OutageSortOption;
}

interface OutageFiltersProps {
  filters: OutageFiltersState;
  onFiltersChange: (filters: OutageFiltersState) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  activeTab?: OutageTab;
}

export function OutageFilters({
  filters,
  onFiltersChange,
  onRefresh,
  isLoading,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  activeTab,
}: OutageFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.stationSearch);
  
  const hasActiveFilters = 
    filters.stationSearch.length > 0 || 
    filters.lines.length > 0 || 
    filters.equipmentTypes.length > 0 ||
    filters.adaOnly;

  const handleClearFilters = () => {
    setSearchInput("");
    onFiltersChange({
      stationSearch: "",
      lines: [],
      equipmentTypes: [],
      adaOnly: false,
      sortBy: "station",
    });
  };

  const handleSearchSubmit = () => {
    onFiltersChange({ ...filters, stationSearch: searchInput });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Main Filters Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
        {/* Station Search */}
        <Input
          label="Station"
          placeholder="Search station..."
          size="sm"
          className="w-full sm:w-52"
          value={searchInput}
          onValueChange={setSearchInput}
          onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
          onBlur={handleSearchSubmit}
          startContent={<Search className="h-4 w-4 text-foreground/50" />}
          isClearable
          onClear={() => {
            setSearchInput("");
            onFiltersChange({ ...filters, stationSearch: "" });
          }}
        />

        {/* Line Filter - Multi-select */}
        <Select
          label="Lines"
          placeholder="All lines"
          size="sm"
          selectionMode="multiple"
          className="w-full sm:w-44"
          selectedKeys={new Set(filters.lines)}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys) as string[];
            onFiltersChange({ ...filters, lines: selected });
          }}
          renderValue={(items) => {
            if (items.length === 0) return null;
            if (items.length <= 3) {
              return (
                <div className="flex items-center gap-1">
                  {Array.from(items).map((item) => (
                    <SubwayBullet key={item.key} line={item.key as string} size="sm" />
                  ))}
                </div>
              );
            }
            return (
              <div className="flex items-center gap-1">
                {Array.from(items).slice(0, 2).map((item) => (
                  <SubwayBullet key={item.key} line={item.key as string} size="sm" />
                ))}
                <Chip size="sm" variant="flat">+{items.length - 2}</Chip>
              </div>
            );
          }}
        >
          {SUBWAY_LINES.map((line) => (
            <SelectItem key={line} textValue={line}>
              <div className="flex items-center gap-2">
                <SubwayBullet line={line} size="sm" />
                <span>{line} Train</span>
              </div>
            </SelectItem>
          ))}
        </Select>

        {/* Equipment Type Filter */}
        <Select
          label="Type"
          placeholder="All equipment"
          size="sm"
          selectionMode="multiple"
          className="w-full sm:w-44"
          selectedKeys={new Set(filters.equipmentTypes)}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys) as EquipmentType[];
            onFiltersChange({ ...filters, equipmentTypes: selected });
          }}
          renderValue={(items) => {
            if (items.length === 0) return null;
            if (items.length === 1) {
              const type = EQUIPMENT_TYPES.find(t => t.value === items[0].key);
              return <span>{type?.label}</span>;
            }
            return <span>Both types</span>;
          }}
        >
          {EQUIPMENT_TYPES.map((type) => (
            <SelectItem key={type.value} textValue={type.label}>
              {type.label}
            </SelectItem>
          ))}
        </Select>

        {/* Sort By */}
        <Select
          label="Sort by"
          size="sm"
          className="w-full sm:w-40"
          selectedKeys={[filters.sortBy]}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as OutageSortOption;
            onFiltersChange({ ...filters, sortBy: selected || "station" });
          }}
          startContent={<ArrowUpDown className="h-3 w-3 text-foreground/50" />}
        >
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} textValue={option.label}>
              {option.label}
            </SelectItem>
          ))}
        </Select>

        {/* ADA Only Toggle */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-default-100">
          <Switch
            size="sm"
            isSelected={filters.adaOnly}
            onValueChange={(value) => onFiltersChange({ ...filters, adaOnly: value })}
          />
          <span className="text-sm text-foreground/70">ADA only</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="flat"
              startContent={<X className="h-4 w-4" />}
              onPress={handleClearFilters}
            >
              Clear
            </Button>
          )}
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isLoading={isLoading}
            startContent={!isLoading && <RefreshCw className="h-4 w-4" />}
            onPress={onRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.stationSearch && (
            <Chip
              size="sm"
              variant="flat"
              onClose={() => {
                setSearchInput("");
                onFiltersChange({ ...filters, stationSearch: "" });
              }}
            >
              Station: {filters.stationSearch}
            </Chip>
          )}
          {filters.lines.map(line => (
            <Chip
              key={line}
              size="sm"
              variant="flat"
              startContent={<SubwayBullet line={line} size="sm" />}
              onClose={() => {
                onFiltersChange({
                  ...filters,
                  lines: filters.lines.filter(l => l !== line)
                });
              }}
            >
              {line}
            </Chip>
          ))}
          {filters.equipmentTypes.map(type => (
            <Chip
              key={type}
              size="sm"
              variant="flat"
              onClose={() => {
                onFiltersChange({
                  ...filters,
                  equipmentTypes: filters.equipmentTypes.filter(t => t !== type)
                });
              }}
            >
              {type === "ELEVATOR" ? "Elevators" : "Escalators"}
            </Chip>
          ))}
          {filters.adaOnly && (
            <Chip
              size="sm"
              variant="flat"
              color="primary"
              onClose={() => onFiltersChange({ ...filters, adaOnly: false })}
            >
              ADA Only
            </Chip>
          )}
        </div>
      )}
    </div>
  );
}

