export const IOS_PRODUCTION_API_BASE_URL =
  "https://nyctransithub.vercel.app";

export type AppTarget = "web" | "ios";

interface ApiUrlResolverOptions {
  target: AppTarget;
  apiBaseUrl?: string;
}

function normalizeNativeApiBaseUrl(value: string): string {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("The native API base URL must use HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("The native API base URL must not contain credentials.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("The native API base URL must be an origin without a path.");
  }

  return url.origin;
}

export function createApiUrlResolver({
  target,
  apiBaseUrl,
}: ApiUrlResolverOptions): (path: string) => string {
  const baseUrl = target === "ios"
    ? normalizeNativeApiBaseUrl(apiBaseUrl ?? IOS_PRODUCTION_API_BASE_URL)
    : "";

  return (path: string) => {
    if (!path.startsWith("/api/")) {
      throw new Error("API paths must start with /api/.");
    }
    return `${baseUrl}${path}`;
  };
}

export const APP_TARGET: AppTarget =
  process.env.NEXT_PUBLIC_APP_TARGET === "ios" ? "ios" : "web";

export const isNativeApp = APP_TARGET === "ios";

export const apiUrl = createApiUrlResolver({
  target: APP_TARGET,
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});

export function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = apiUrl(path);
  return init === undefined ? fetch(url) : fetch(url, init);
}
