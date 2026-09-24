const DEFAULT_NATIVE_ORIGINS = ["capacitor://localhost"] as const;

const EXCLUDED_API_PREFIXES = ["/api/commute/", "/api/ingest/"] as const;

function allowedNativeOrigins(): ReadonlySet<string> {
  const configuredOrigins = process.env.NATIVE_API_ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

  return new Set([...DEFAULT_NATIVE_ORIGINS, ...configuredOrigins]);
}

export function isNativeCorsRoute(pathname: string): boolean {
  return pathname.startsWith("/api/") &&
    !EXCLUDED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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
