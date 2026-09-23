import type { EquipmentOutage, EquipmentType } from "@/types/mta";

export type OutagePeriod = "current" | "upcoming";
export type OutageSort = "station" | "recent" | "return";

export interface AccessibilityFilters {
  stationSearch: string;
  lines: string[];
  equipmentTypes: EquipmentType[];
  adaOnly: boolean;
  sortBy: OutageSort;
}

type SerializedOutage = Omit<EquipmentOutage, "outageStartTime" | "estimatedReturn"> & {
  outageStartTime: Date | string | null;
  estimatedReturn: Date | string | null;
};

export function hydrateEquipmentOutage(outage: SerializedOutage): EquipmentOutage {
  return {
    ...outage,
    outageStartTime: outage.outageStartTime ? new Date(outage.outageStartTime) : null,
    estimatedReturn: outage.estimatedReturn ? new Date(outage.estimatedReturn) : null,
  };
}

export function filterAndSortOutages(
  outages: EquipmentOutage[],
  filters: AccessibilityFilters,
): EquipmentOutage[] {
  const station = filters.stationSearch.trim().toLocaleLowerCase();
  return outages
    .filter((outage) => !station || outage.stationName.toLocaleLowerCase().includes(station))
    .filter((outage) => filters.lines.length === 0
      || outage.trainLines.some((line) => filters.lines.includes(line)))
    .filter((outage) => filters.equipmentTypes.length === 0
      || filters.equipmentTypes.includes(outage.equipmentType))
    .filter((outage) => !filters.adaOnly || outage.adaCompliant)
    .toSorted((left, right) => {
      if (filters.sortBy === "recent") {
        return (right.outageStartTime?.getTime() ?? 0) - (left.outageStartTime?.getTime() ?? 0);
      }
      if (filters.sortBy === "return") {
        return (left.estimatedReturn?.getTime() ?? Number.POSITIVE_INFINITY)
          - (right.estimatedReturn?.getTime() ?? Number.POSITIVE_INFINITY);
      }
      return left.stationName.localeCompare(right.stationName);
    });
}
