export interface LocationSearchResultBase {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
}

export interface StationLocationSearchResult extends LocationSearchResultBase {
  kind: "station";
  stationId: string;
}

export interface PlaceLocationSearchResult extends LocationSearchResultBase {
  kind: "place";
}

export type LocationSearchResult =
  | StationLocationSearchResult
  | PlaceLocationSearchResult;

export interface LocationSearchResponse {
  locations: LocationSearchResult[];
}

export interface NearbySearchOrigin {
  latitude: number;
  longitude: number;
  label: string;
  source: "device" | "map" | "search";
}
