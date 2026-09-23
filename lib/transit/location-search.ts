import { z } from "zod";

import { searchStations } from "@/lib/gtfs";
import type { LocationSearchResult } from "@/types/location";

const NYC_VIEWBOX = "-74.3,40.4,-73.6,41.0";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

export const locationSearchRequestSchema = z.object({
  query: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(10).default(8),
});

const nominatimResultSchema = z.object({
  osm_type: z.string().min(1),
  osm_id: z.union([z.string(), z.number()]),
  display_name: z.string().min(1),
  // Nominatim returns an empty name for many valid residential addresses.
  name: z.string().optional(),
  lat: z.coerce.number().min(40.4).max(41),
  lon: z.coerce.number().min(-74.3).max(-73.6),
  address: z.object({
    house_number: z.string().optional(),
    road: z.string().optional(),
    neighbourhood: z.string().optional(),
    suburb: z.string().optional(),
    borough: z.string().optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
  }).optional(),
}).passthrough();

type NominatimResult = z.infer<typeof nominatimResultSchema>;

function getPlaceName(result: NominatimResult): string {
  const address = result.address;
  if (address?.house_number && address.road) return `${address.house_number} ${address.road}`;
  if (result.name) return result.name;
  if (address?.road) return address.road;
  return result.display_name.split(",")[0]?.trim() || "New York location";
}

function getPlaceDescription(result: NominatimResult): string {
  const address = result.address;
  const parts = [
    address?.neighbourhood,
    address?.borough ?? address?.suburb,
    address?.city && address.city !== "New York" ? address.city : undefined,
  ].filter((part): part is string => Boolean(part));
  const area = [...new Set(parts)].slice(0, 2).join(", ") || "New York City";
  return address?.postcode ? `${area} · ${address.postcode}` : area;
}

interface PlaceCandidate {
  location: LocationSearchResult;
  isStreetAddress: boolean;
}

function toPlaceCandidate(value: unknown): PlaceCandidate | null {
  const parsed = nominatimResultSchema.safeParse(value);
  if (!parsed.success) return null;
  const result = parsed.data;
  return {
    location: {
      id: `place:${result.osm_type}:${result.osm_id}`,
      kind: "place",
      name: getPlaceName(result),
      description: getPlaceDescription(result),
      latitude: result.lat,
      longitude: result.lon,
    },
    isStreetAddress: Boolean(result.address?.house_number && result.address.road),
  };
}

export async function searchLocations(query: string, limit = 8): Promise<LocationSearchResult[]> {
  const input = locationSearchRequestSchema.parse({ query, limit });
  const stationLimit = Math.max(1, Math.ceil(input.limit / 2));
  const stationResults: LocationSearchResult[] = searchStations(input.query, stationLimit)
    .slice(0, stationLimit)
    .map((station) => ({
      id: `station:${station.id}`,
      kind: "station" as const,
      name: station.name,
      description: "Subway station",
      latitude: station.latitude,
      longitude: station.longitude,
      stationId: station.id,
    }));

  const searchQuery = /\b(?:ny|new york)\b/i.test(input.query)
    ? input.query
    : `${input.query}, New York, NY`;
  const params = new URLSearchParams({
    q: searchQuery,
    format: "json",
    addressdetails: "1",
    namedetails: "0",
    limit: String(input.limit),
    countrycodes: "us",
    viewbox: NYC_VIEWBOX,
    bounded: "1",
  });

  try {
    const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "NYC-Transit-Hub/0.1",
      },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(3_500),
    });
    if (!response.ok) return stationResults;
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) return stationResults;
    const placeResults = payload
      .map(toPlaceCandidate)
      .filter((candidate): candidate is PlaceCandidate => candidate !== null)
      .toSorted((left, right) => Number(right.isStreetAddress) - Number(left.isStreetAddress))
      .map((candidate) => candidate.location);
    const looksLikeStreetAddress = /\d/.test(input.query);
    return (looksLikeStreetAddress
      ? [...placeResults, ...stationResults]
      : [...stationResults, ...placeResults]
    ).slice(0, input.limit);
  } catch {
    return stationResults;
  }
}
