import type { ServiceAlert } from "@/types/mta";

export type IncidentStatus = "active" | "upcoming" | "resolved";

export function classifyIncidentStatus(
  incident: ServiceAlert,
  now = new Date(),
): IncidentStatus {
  if (incident.activePeriodEnd && incident.activePeriodEnd <= now) {
    return "resolved";
  }

  if (incident.activePeriodStart && incident.activePeriodStart > now) {
    return "upcoming";
  }

  return "active";
}

export function partitionIncidentsByStatus(
  incidents: ServiceAlert[],
  now = new Date(),
) {
  const partitioned: Record<IncidentStatus, ServiceAlert[]> = {
    active: [],
    upcoming: [],
    resolved: [],
  };

  for (const incident of incidents) {
    partitioned[classifyIncidentStatus(incident, now)].push(incident);
  }

  return partitioned;
}
