const DEFAULT_NATIVE_ORIGINS = ["capacitor://localhost"] as const;

const PUBLIC_NATIVE_API_PATHS = new Set([
  "/api/alerts",
  "/api/buses/nearby",
  "/api/buses/realtime",
  "/api/buses/routes",
  "/api/buses/stops",
  "/api/elevators",
  "/api/elevators/upcoming",
  "/api/incidents",
  "/api/lirr/realtime",
  "/api/lirr/stations",
  "/api/locations",
  "/api/metrics/crowding",
  "/api/metro-north/realtime",
  "/api/metro-north/stations",
  "/api/reliability",
  "/api/routes",
  "/api/routes/accessible",
  "/api/routes/trip",
  "/api/stations",
  "/api/status",
  "/api/trains/realtime",
]);

function allowedNativeOrigins(): ReadonlySet<string> {
  const configuredOrigins = process.env.NATIVE_API_ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

  return new Set([...DEFAULT_NATIVE_ORIGINS, ...configuredOrigins]);
}

export function isNativeCorsRoute(pathname: string): boolean {
  return PUBLIC_NATIVE_API_PATHS.has(pathname);
}

export function createCorsHeaders(
  origin: string | null,
): Record<string, string> | null {
  if (!origin || !allowedNativeOrigins().has(origin)) return null;

  return {
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}
