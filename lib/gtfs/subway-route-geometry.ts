import { z } from "zod";

import type { SubwayTrip, TransitDirection } from "@/types/transit";

const coordinateSchema = z.tuple([z.number().finite(), z.number().finite()]);

const geometryShapeSchema = z.object({
  coordinates: z.array(coordinateSchema).min(2),
});

const geometryPatternSchema = z
  .object({
    shapeId: z.string().min(1),
    directionId: z.union([z.literal(0), z.literal(1)]),
    headsign: z.string(),
    stopIds: z.array(z.string().min(1)).min(1),
    stopDistances: z.array(z.number().finite().nonnegative()).min(1),
  })
  .superRefine((pattern, context) => {
    if (pattern.stopIds.length !== pattern.stopDistances.length) {
      context.addIssue({
        code: "custom",
        message: "stopIds and stopDistances must have equal lengths",
      });
    }
    for (let index = 1; index < pattern.stopDistances.length; index += 1) {
      if (pattern.stopDistances[index] < pattern.stopDistances[index - 1]) {
        context.addIssue({
          code: "custom",
          message: "stopDistances must be monotonic",
        });
        break;
      }
    }
  });

const subwayGeometryArtifactSchema = z
  .object({
    schemaVersion: z.literal(1),
    routeId: z.string().min(1),
    generatedAt: z.string().min(1),
    source: z.object({
      url: z.string().url(),
      feedVersion: z.string(),
      feedStartDate: z.string(),
      feedEndDate: z.string(),
    }),
    shapes: z.record(z.string(), geometryShapeSchema),
    patterns: z.record(z.string(), geometryPatternSchema),
    tripAliases: z.record(z.string(), z.string()),
  })
  .superRefine((artifact, context) => {
    for (const [patternId, pattern] of Object.entries(artifact.patterns)) {
      if (!artifact.shapes[pattern.shapeId]) {
        context.addIssue({
          code: "custom",
          path: ["patterns", patternId, "shapeId"],
          message: `Unknown shape ${pattern.shapeId}`,
        });
      }
    }
    for (const [tripAlias, patternId] of Object.entries(artifact.tripAliases)) {
      if (!artifact.patterns[patternId]) {
        context.addIssue({
          code: "custom",
          path: ["tripAliases", tripAlias],
          message: `Unknown pattern ${patternId}`,
        });
      }
    }
  });

export type SubwayGeometryShape = z.infer<typeof geometryShapeSchema>;
export type SubwayGeometryPattern = z.infer<typeof geometryPatternSchema>;
export type SubwayGeometryArtifact = z.infer<
  typeof subwayGeometryArtifactSchema
>;

export interface ResolvedSubwayGeometry {
  match: "exact-trip" | "trip-shape" | "stop-pattern" | "route-direction";
  patternId: string;
  shapeId: string;
  shape: SubwayGeometryShape;
  pattern: SubwayGeometryPattern;
}

export interface ShapeAwareSubwayTripPosition {
  coordinates: [latitude: number, longitude: number];
  previousStopId: string;
  nextStopId: string;
  progressRatio: number;
  confidence: "station" | "estimated";
}

function directionIdFor(direction: TransitDirection): 0 | 1 | null {
  switch (direction) {
    case "northbound":
    case "eastbound":
      return 0;
    case "southbound":
    case "westbound":
      return 1;
    default:
      return null;
  }
}

function baseStopId(stopId: string): string {
  return stopId.replace(/[NSEW]$/, "");
}

function stopMatchScore(actualStopId: string, patternStopId: string): number {
  if (actualStopId === patternStopId) return 4;
  return baseStopId(actualStopId) === baseStopId(patternStopId) ? 2 : 0;
}

function orderedStopScore(
  actualStopIds: readonly string[],
  patternStopIds: readonly string[],
): { score: number; matchedStops: number } {
  let score = 0;
  let matchedStops = 0;
  let patternIndex = 0;
  let previousMatch = -2;

  for (const actualStopId of actualStopIds) {
    let bestIndex = -1;
    let bestScore = 0;
    for (let index = patternIndex; index < patternStopIds.length; index += 1) {
      const matchScore = stopMatchScore(actualStopId, patternStopIds[index]);
      if (matchScore > bestScore) {
        bestIndex = index;
        bestScore = matchScore;
        if (matchScore === 4) break;
      }
    }
    if (bestIndex < 0) continue;

    matchedStops += 1;
    score += bestScore;
    if (bestIndex === previousMatch + 1) score += 2;
    previousMatch = bestIndex;
    patternIndex = bestIndex + 1;
  }

  if (
    actualStopIds.length > 0 &&
    patternStopIds.length > 0 &&
    baseStopId(actualStopIds.at(-1)!) === baseStopId(patternStopIds.at(-1)!)
  ) {
    score += 6;
  }

  return { score, matchedStops };
}

function resolvedPattern(
  artifact: SubwayGeometryArtifact,
  patternId: string,
  match: ResolvedSubwayGeometry["match"],
): ResolvedSubwayGeometry | null {
  const pattern = artifact.patterns[patternId];
  const shape = pattern ? artifact.shapes[pattern.shapeId] : null;
  if (!pattern || !shape) return null;
  return { match, patternId, shapeId: pattern.shapeId, shape, pattern };
}

/**
 * Validates generated geometry at its browser/server boundary. Generated files
 * are derived from an external feed and remain untrusted until this succeeds.
 */
export function parseSubwayGeometryArtifact(
  input: unknown,
): SubwayGeometryArtifact | null {
  const result = subwayGeometryArtifactSchema.safeParse(input);
  return result.success ? result.data : null;
}

/** Resolve one realtime Trip to the most specific static service pattern. */
export function resolveGeometryForTrip(
  trip: SubwayTrip,
  artifact: SubwayGeometryArtifact,
): ResolvedSubwayGeometry | null {
  if (trip.route.id !== artifact.routeId) return null;

  const exactPatternId = artifact.tripAliases[trip.id];
  if (exactPatternId) {
    return resolvedPattern(artifact, exactPatternId, "exact-trip");
  }

  const embeddedShapeId = Object.keys(artifact.shapes)
    .sort((a, b) => b.length - a.length)
    .find((shapeId) => trip.id.endsWith(shapeId));
  const directionId = directionIdFor(trip.direction);
  const actualStopIds = trip.stopTimeUpdates.map((update) => update.stopId);
  const candidates = Object.entries(artifact.patterns).filter(
    ([, pattern]) =>
      (!embeddedShapeId || pattern.shapeId === embeddedShapeId) &&
      (directionId === null || pattern.directionId === directionId),
  );

  let best:
    | {
        patternId: string;
        score: number;
        matchedStops: number;
      }
    | undefined;
  for (const [patternId, pattern] of candidates) {
    const scored = orderedStopScore(actualStopIds, pattern.stopIds);
    const candidate = { patternId, ...scored };
    if (
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score &&
        candidate.matchedStops > best.matchedStops)
    ) {
      best = candidate;
    }
  }

  if (embeddedShapeId && best) {
    return resolvedPattern(artifact, best.patternId, "trip-shape");
  }
  if (best && best.matchedStops >= Math.min(2, actualStopIds.length)) {
    return resolvedPattern(artifact, best.patternId, "stop-pattern");
  }
  if (directionId !== null && candidates.length === 1) {
    return resolvedPattern(artifact, candidates[0][0], "route-direction");
  }
  return null;
}

const EARTH_RADIUS_METERS = 6_371_000;
const cumulativeDistanceCache = new WeakMap<SubwayGeometryShape, number[]>();

function distanceMeters(
  from: readonly [number, number],
  to: readonly [number, number],
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to[0] - from[0]);
  const longitudeDelta = toRadians(to[1] - from[1]);
  const fromLatitude = toRadians(from[0]);
  const toLatitude = toRadians(to[0]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

function cumulativeDistances(shape: SubwayGeometryShape): number[] {
  const cached = cumulativeDistanceCache.get(shape);
  if (cached) return cached;

  const distances = [0];
  for (let index = 1; index < shape.coordinates.length; index += 1) {
    distances.push(
      distances[index - 1] +
        distanceMeters(shape.coordinates[index - 1], shape.coordinates[index]),
    );
  }
  cumulativeDistanceCache.set(shape, distances);
  return distances;
}

function coordinateAtDistance(
  shape: SubwayGeometryShape,
  requestedDistance: number,
): [number, number] {
  const distances = cumulativeDistances(shape);
  const totalDistance = distances.at(-1) ?? 0;
  const targetDistance = Math.max(0, Math.min(totalDistance, requestedDistance));
  let low = 0;
  let high = distances.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (distances[middle] < targetDistance) low = middle + 1;
    else high = middle;
  }

  const nextIndex = Math.max(1, low);
  const previousIndex = nextIndex - 1;
  const segmentDistance = distances[nextIndex] - distances[previousIndex];
  const ratio =
    segmentDistance > 0
      ? (targetDistance - distances[previousIndex]) / segmentDistance
      : 0;
  const previous = shape.coordinates[previousIndex];
  const next = shape.coordinates[nextIndex];
  return [
    previous[0] + (next[0] - previous[0]) * ratio,
    previous[1] + (next[1] - previous[1]) * ratio,
  ];
}

function stopDistance(
  pattern: SubwayGeometryPattern,
  stopId: string,
): number | null {
  let index = pattern.stopIds.indexOf(stopId);
  if (index < 0) {
    const stationId = baseStopId(stopId);
    index = pattern.stopIds.findIndex(
      (candidate) => baseStopId(candidate) === stationId,
    );
  }
  return index >= 0 ? pattern.stopDistances[index] : null;
}

/** Project existing trip-progress semantics onto an already-resolved shape. */
export function projectTripOnSubwayGeometry(
  trip: SubwayTrip,
  geometry: ResolvedSubwayGeometry,
): ShapeAwareSubwayTripPosition | null {
  const progress = trip.progress;
  if (progress.state === "unknown" || progress.state === "not-started") {
    return null;
  }

  if (progress.state === "at-stop") {
    const distance = stopDistance(geometry.pattern, progress.stopId);
    if (distance === null) return null;
    return {
      coordinates: coordinateAtDistance(geometry.shape, distance),
      previousStopId: progress.stopId,
      nextStopId: progress.stopId,
      progressRatio: 1,
      confidence: "station",
    };
  }

  if (!progress.previousStopId) return null;
  const previousDistance = stopDistance(
    geometry.pattern,
    progress.previousStopId,
  );
  const nextDistance = stopDistance(geometry.pattern, progress.nextStopId);
  if (
    previousDistance === null ||
    nextDistance === null ||
    nextDistance < previousDistance
  ) {
    return null;
  }

  const ratio = Math.max(
    0,
    Math.min(
      1,
      progress.state === "approaching"
        ? 0.82
        : progress.progressRatio ??
            (progress.state === "departed-previous-stop" ? 0.2 : 0.5),
    ),
  );
  return {
    coordinates: coordinateAtDistance(
      geometry.shape,
      previousDistance + (nextDistance - previousDistance) * ratio,
    ),
    previousStopId: progress.previousStopId,
    nextStopId: progress.nextStopId,
    progressRatio: ratio,
    confidence: "estimated",
  };
}

export function getRenderableSubwayGeometries(
  trips: readonly SubwayTrip[],
  artifact: SubwayGeometryArtifact,
  selectedTripId?: string,
): ResolvedSubwayGeometry[] {
  const selectedTrip = selectedTripId
    ? trips.find((trip) => trip.id === selectedTripId)
    : null;
  const candidates = selectedTrip ? [selectedTrip] : trips;
  const byShapeId = new Map<string, ResolvedSubwayGeometry>();

  for (const trip of candidates) {
    const resolved = resolveGeometryForTrip(trip, artifact);
    if (resolved && !byShapeId.has(resolved.shapeId)) {
      byShapeId.set(resolved.shapeId, resolved);
    }
  }
  return [...byShapeId.values()];
}

type FetchGeometryArtifact = (routeId: string) => Promise<unknown>;

async function fetchGeometryArtifact(routeId: string): Promise<unknown> {
  const response = await fetch(
    `/data/gtfs/subway-geometry/${encodeURIComponent(routeId)}.json`,
  );
  if (!response.ok) throw new Error(`Subway geometry HTTP ${response.status}`);
  return response.json();
}

/** A route-scoped cache whose lifetime is independent of realtime polling. */
export function createSubwayGeometryLoader(
  fetchArtifact: FetchGeometryArtifact = fetchGeometryArtifact,
) {
  const cache = new Map<string, Promise<SubwayGeometryArtifact | null>>();

  return {
    load(routeId: string): Promise<SubwayGeometryArtifact | null> {
      const cached = cache.get(routeId);
      if (cached) return cached;

      const request = fetchArtifact(routeId)
        .then((input) => {
          const artifact = parseSubwayGeometryArtifact(input);
          if (!artifact) {
            console.warn(
              JSON.stringify({
                event: "subway_geometry_invalid_artifact",
                routeId,
              }),
            );
          }
          return artifact;
        })
        .catch((error: unknown) => {
          console.warn(
            JSON.stringify({
              event: "subway_geometry_load_failed",
              routeId,
              error: error instanceof Error ? error.message : "unknown_error",
            }),
          );
          cache.delete(routeId);
          return null;
        });
      cache.set(routeId, request);
      return request;
    },
  };
}

export const subwayGeometryLoader = createSubwayGeometryLoader();
