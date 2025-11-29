"use client";

import { Button, Select, SelectItem, Chip } from "@heroui/react";
import { X, RefreshCw, ArrowUpDown } from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import type { AlertType, AlertSeverity, SubwayLine } from "@/types/mta";

// All subway lines for filtering
const SUBWAY_LINES: SubwayLine[] = [
  "1", "2", "3", "4", "5", "6", "7",
  "A", "C", "E", "B", "D", "F", "M",
  "G", "J", "Z", "L", "N", "Q", "R", "W", "S", "SIR"
];

// Alert types for filtering
const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: "DELAY", label: "Delays" },
  { value: "PLANNED_WORK", label: "Planned Work" },
  { value: "SERVICE_CHANGE", label: "Service Changes" },
  { value: "STATION_CLOSURE", label: "Station Closures" },
  { value: "DETOUR", label: "Detours" },
  { value: "REDUCED_SERVICE", label: "Reduced Service" },
  { value: "SHUTTLE_BUS", label: "Shuttle Buses" },
  { value: "OTHER", label: "Other" },
];

// Severity levels for filtering
const SEVERITY_LEVELS: { value: AlertSeverity; label: string; color: string }[] = [
  { value: "SEVERE", label: "Major", color: "text-danger" },
  { value: "WARNING", label: "Delays", color: "text-warning" },
  { value: "INFO", label: "Info", color: "text-default-500" },
];

// Sort options for Active Now tab
export type ActiveSortOption = "severity" | "recent";
const ACTIVE_SORT_OPTIONS: { value: ActiveSortOption; label: string }[] = [
  { value: "severity", label: "Severity" },
  { value: "recent", label: "Most Recent" },
];

// Sort options for Upcoming tab
export type UpcomingSortOption = "soonest" | "severity";
const UPCOMING_SORT_OPTIONS: { value: UpcomingSortOption; label: string }[] = [
  { value: "soonest", label: "Soonest" },
  { value: "severity", label: "Severity" },
];

export type SortOption = ActiveSortOption | UpcomingSortOption;

export type IncidentTab = "active" | "upcoming";

export interface IncidentFiltersState {
  routeIds: string[];
  alertTypes: AlertType[];
  severities: AlertSeverity[];
  sortBy: SortOption;
}

interface IncidentFiltersProps {
  filters: IncidentFiltersState;
  onFiltersChange: (filters: IncidentFiltersState) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  activeTab: IncidentTab;
}

export function IncidentFilters({
  filters,
  onFiltersChange,
  onRefresh,
  isLoading,
  activeTab,
}: IncidentFiltersProps) {
  const hasActiveFilters = 
    filters.routeIds.length > 0 || 
    filters.alertTypes.length > 0 || 
    filters.severities.length > 0;

  const handleClearFilters = () => {
    onFiltersChange({
      routeIds: [],
      alertTypes: [],
      severities: [],
      sortBy: activeTab === "active" ? "severity" : "soonest",
    });
  };

  const sortOptions = activeTab === "active" ? ACTIVE_SORT_OPTIONS : UPCOMING_SORT_OPTIONS;
  const defaultSort = activeTab === "active" ? "severity" : "soonest";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Line Filter - Multi-select */}
      <Select
        label="Lines"
        placeholder="All lines"
        size="sm"
        selectionMode="multiple"
        className="w-full sm:w-44"
        selectedKeys={new Set(filters.routeIds)}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys) as string[];
          onFiltersChange({ ...filters, routeIds: selected });
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

      {/* Type Filter - Multi-select */}
      <Select
        label="Types"
        placeholder="All types"
        size="sm"
        selectionMode="multiple"
        className="w-full sm:w-48"
        selectedKeys={new Set(filters.alertTypes)}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys) as AlertType[];
          onFiltersChange({ ...filters, alertTypes: selected });
        }}
        renderValue={(items) => {
          if (items.length === 0) return null;
          if (items.length === 1) {
            const type = ALERT_TYPES.find(t => t.value === items[0].key);
            return <span>{type?.label}</span>;
          }
          return <span>{items.length} types</span>;
        }}
      >
        {ALERT_TYPES.map((type) => (
          <SelectItem key={type.value} textValue={type.label}>
            {type.label}
          </SelectItem>
        ))}
      </Select>

      {/* Severity Filter - Multi-select */}
      <Select
        label="Severity"
        placeholder="All"
        size="sm"
        selectionMode="multiple"
        className="w-full sm:w-40"
        selectedKeys={new Set(filters.severities)}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys) as AlertSeverity[];
          onFiltersChange({ ...filters, severities: selected });
        }}
        renderValue={(items) => {
          if (items.length === 0) return null;
          if (items.length === 1) {
            const level = SEVERITY_LEVELS.find(l => l.value === items[0].key);
            return <span className={level?.color}>{level?.label}</span>;
          }
          return <span>{items.length} levels</span>;
        }}
      >
        {SEVERITY_LEVELS.map((level) => (
          <SelectItem key={level.value} textValue={level.label}>
            <span className={level.color}>{level.label}</span>
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
          const selected = Array.from(keys)[0] as SortOption;
          onFiltersChange({ ...filters, sortBy: selected || defaultSort });
        }}
        startContent={<ArrowUpDown className="h-3 w-3 text-foreground/50" />}
      >
        {sortOptions.map((option) => (
          <SelectItem key={option.value} textValue={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </Select>

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
  );
}
