export interface RiderLocationContext {
  name: string;
  latitude: number;
  longitude: number;
  stationId?: string;
}

export interface PlanQueryState {
  from: RiderLocationContext | null;
  to: RiderLocationContext | null;
  accessible: boolean;
}

type SearchParamsReader = Pick<URLSearchParams, "get">;

const LOCATION_KEYS = {
  from: { name: "from", latitude: "fromLat", longitude: "fromLon", stationId: "fromStation" },
  to: { name: "to", latitude: "toLat", longitude: "toLon", stationId: "toStation" },
} as const;

function parseCoordinate(value: string | null, minimum: number, maximum: number): number | null {
  if (value === null || value.trim() === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

function parseLocation(
  params: SearchParamsReader,
  keys: (typeof LOCATION_KEYS)[keyof typeof LOCATION_KEYS],
): RiderLocationContext | null {
  const name = params.get(keys.name)?.trim();
  const latitude = parseCoordinate(params.get(keys.latitude), 40.4, 41);
  const longitude = parseCoordinate(params.get(keys.longitude), -74.3, -73.6);
  if (!name || latitude === null || longitude === null) return null;

  const stationId = params.get(keys.stationId)?.trim();
  return { name, latitude, longitude, ...(stationId ? { stationId } : {}) };
}

export function parsePlanQueryState(params: SearchParamsReader): PlanQueryState {
  return {
    from: parseLocation(params, LOCATION_KEYS.from),
    to: parseLocation(params, LOCATION_KEYS.to),
    accessible: params.get("accessible") === "true",
  };
}

function writeLocation(
  params: URLSearchParams,
  keys: (typeof LOCATION_KEYS)[keyof typeof LOCATION_KEYS],
  location: RiderLocationContext | null,
): void {
  Object.values(keys).forEach((key) => params.delete(key));
  if (!location) return;
  params.set(keys.name, location.name);
  params.set(keys.latitude, String(location.latitude));
  params.set(keys.longitude, String(location.longitude));
  if (location.stationId) params.set(keys.stationId, location.stationId);
}

export function buildPlanQueryString(
  state: PlanQueryState,
  current: URLSearchParams = new URLSearchParams(),
): string {
  const params = new URLSearchParams(current.toString());
  writeLocation(params, LOCATION_KEYS.from, state.from);
  writeLocation(params, LOCATION_KEYS.to, state.to);
  if (state.accessible) params.set("accessible", "true");
  else params.delete("accessible");
  return params.toString();
}

