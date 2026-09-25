import { isIP } from "node:net";

export const PRODUCTION_API_ORIGIN = "https://nyctransithub.vercel.app";

function isPrivateIpv4(hostname: string): boolean {
  const [first, second] = hostname.split(".").map(Number);

  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || first >= 224;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("::ffff:")
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe8")
    || normalized.startsWith("fe9")
    || normalized.startsWith("fea")
    || normalized.startsWith("feb");
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (
    normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized.endsWith(".local")
  ) {
    return true;
  }

  const ipVersion = isIP(normalized.replace(/^\[|\]$/g, ""));
  if (ipVersion === 4) return isPrivateIpv4(normalized);
  if (ipVersion === 6) return isPrivateIpv6(normalized);
  return false;
}

export function resolveNativeApiBaseUrl(value?: string): string {
  const configuredValue = value?.trim() || PRODUCTION_API_ORIGIN;
  const url = new URL(configuredValue);

  if (url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must use HTTPS for a native release.");
  }
  if (url.username || url.password) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must not contain credentials.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be an origin without a path, query, or fragment.");
  }
  if (isLocalHostname(url.hostname)) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must not use a local or private-network host.");
  }

  return url.origin;
}
