#!/usr/bin/env node

/**
 * Build compact, route-scoped subway geometry from the official MTA GTFS feed.
 *
 * Usage:
 *   node scripts/build-subway-geometry.mjs [path/to/gtfs_subway.zip|directory]
 *
 * With no input path the script downloads the official regular subway feed.
 * Generated artifacts are committed under public/data/gtfs/subway-geometry/.
 */

import { execFileSync } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline";

const OFFICIAL_FEED_URL =
  "https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip";
const OUTPUT_DIRECTORY = resolve(
  "public",
  "data",
  "gtfs",
  "subway-geometry",
);
const SIMPLIFICATION_TOLERANCE_METERS = 4;
const MAX_STOP_ANCHOR_ERROR_METERS = 350;
const EARTH_RADIUS_METERS = 6_371_000;

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.replace(/\r$/, ""));
  return values;
}

async function readCsv(filePath) {
  const lines = (await readFile(filePath, "utf8")).split(/\r?\n/);
  const headers = parseCsvLine(lines[0] ?? "");
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

async function streamCsv(filePath, visit) {
  const reader = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });
  let headers = null;
  for await (const line of reader) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }
    if (!line) continue;
    const values = parseCsvLine(line);
    visit(
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""]),
      ),
    );
  }
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function realtimeTripAlias(staticTripId) {
  const parts = staticTripId.split("_");
  return parts.length >= 2 ? parts.slice(-2).join("_") : staticTripId;
}

function planarPoint(coordinate, referenceLatitude) {
  const latitudeRadians = (referenceLatitude * Math.PI) / 180;
  return [
    coordinate[1] * 111_320 * Math.cos(latitudeRadians),
    coordinate[0] * 110_540,
  ];
}

function squaredDistanceToSegment(point, start, end) {
  const segmentX = end[0] - start[0];
  const segmentY = end[1] - start[1];
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point[0] - start[0]) * segmentX +
              (point[1] - start[1]) * segmentY) /
              lengthSquared,
          ),
        );
  const projectedX = start[0] + segmentX * projection;
  const projectedY = start[1] + segmentY * projection;
  const deltaX = point[0] - projectedX;
  const deltaY = point[1] - projectedY;
  return { distanceSquared: deltaX * deltaX + deltaY * deltaY, projection };
}

function simplifyCoordinates(coordinates, toleranceMeters) {
  if (coordinates.length <= 2) return coordinates;
  const referenceLatitude =
    coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0) /
    coordinates.length;
  const planar = coordinates.map((coordinate) =>
    planarPoint(coordinate, referenceLatitude),
  );
  const keep = new Uint8Array(coordinates.length);
  keep[0] = 1;
  keep[coordinates.length - 1] = 1;
  const stack = [[0, coordinates.length - 1]];
  const toleranceSquared = toleranceMeters * toleranceMeters;

  while (stack.length > 0) {
    const [startIndex, endIndex] = stack.pop();
    let furthestIndex = -1;
    let furthestDistance = toleranceSquared;
    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const { distanceSquared } = squaredDistanceToSegment(
        planar[index],
        planar[startIndex],
        planar[endIndex],
      );
      if (distanceSquared > furthestDistance) {
        furthestDistance = distanceSquared;
        furthestIndex = index;
      }
    }
    if (furthestIndex >= 0) {
      keep[furthestIndex] = 1;
      stack.push([startIndex, furthestIndex], [furthestIndex, endIndex]);
    }
  }
  return coordinates.filter((_, index) => keep[index] === 1);
}

function haversineMeters(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
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

function shapeMetrics(coordinates) {
  const referenceLatitude =
    coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0) /
    coordinates.length;
  const planar = coordinates.map((coordinate) =>
    planarPoint(coordinate, referenceLatitude),
  );
  const cumulative = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    cumulative.push(
      cumulative[index - 1] +
        haversineMeters(coordinates[index - 1], coordinates[index]),
    );
  }
  return { planar, cumulative, referenceLatitude };
}

/**
 * Finds a globally monotonic stop-to-shape assignment. Each stop considers
 * every shape segment; dynamic programming selects the lowest total distance
 * path whose segment positions never move backward.
 */
function matchStopsToShape(stopCoordinates, shapeCoordinates) {
  if (stopCoordinates.length === 0 || shapeCoordinates.length < 2) return null;
  const { planar, cumulative, referenceLatitude } = shapeMetrics(shapeCoordinates);
  const segmentCount = shapeCoordinates.length - 1;
  const projections = stopCoordinates.map((coordinate) => {
    const point = planarPoint(coordinate, referenceLatitude);
    return Array.from({ length: segmentCount }, (_, segmentIndex) => {
      const projected = squaredDistanceToSegment(
        point,
        planar[segmentIndex],
        planar[segmentIndex + 1],
      );
      const segmentLength =
        cumulative[segmentIndex + 1] - cumulative[segmentIndex];
      return {
        distanceSquared: projected.distanceSquared,
        along:
          cumulative[segmentIndex] + segmentLength * projected.projection,
      };
    });
  });

  let previousCosts = Float64Array.from(
    projections[0].map((projection) => projection.distanceSquared),
  );
  const backPointers = [];
  for (let stopIndex = 1; stopIndex < projections.length; stopIndex += 1) {
    const currentCosts = new Float64Array(segmentCount);
    currentCosts.fill(Number.POSITIVE_INFINITY);
    const pointers = new Int32Array(segmentCount);
    pointers.fill(-1);
    let prefixCost = Number.POSITIVE_INFINITY;
    let prefixIndex = -1;

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      if (
        segmentIndex > 0 &&
        previousCosts[segmentIndex - 1] < prefixCost
      ) {
        prefixCost = previousCosts[segmentIndex - 1];
        prefixIndex = segmentIndex - 1;
      }
      let bestCost = prefixCost;
      let bestIndex = prefixIndex;
      if (
        projections[stopIndex - 1][segmentIndex].along <=
          projections[stopIndex][segmentIndex].along &&
        previousCosts[segmentIndex] < bestCost
      ) {
        bestCost = previousCosts[segmentIndex];
        bestIndex = segmentIndex;
      }
      if (bestIndex >= 0) {
        currentCosts[segmentIndex] =
          bestCost + projections[stopIndex][segmentIndex].distanceSquared;
        pointers[segmentIndex] = bestIndex;
      }
    }
    previousCosts = currentCosts;
    backPointers.push(pointers);
  }

  let finalSegment = -1;
  let finalCost = Number.POSITIVE_INFINITY;
  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    if (previousCosts[segmentIndex] < finalCost) {
      finalCost = previousCosts[segmentIndex];
      finalSegment = segmentIndex;
    }
  }
  if (finalSegment < 0) return null;

  const selectedSegments = new Int32Array(stopCoordinates.length);
  selectedSegments[selectedSegments.length - 1] = finalSegment;
  for (let stopIndex = selectedSegments.length - 1; stopIndex > 0; stopIndex -= 1) {
    selectedSegments[stopIndex - 1] =
      backPointers[stopIndex - 1][selectedSegments[stopIndex]];
  }
  const selected = projections.map(
    (stopProjections, index) => stopProjections[selectedSegments[index]],
  );
  const maximumError = Math.sqrt(
    Math.max(...selected.map((projection) => projection.distanceSquared)),
  );
  if (maximumError > MAX_STOP_ANCHOR_ERROR_METERS) return null;

  return selected.map((projection) => Math.round(projection.along));
}

async function prepareInput(inputPath) {
  if (inputPath && !existsSync(inputPath)) {
    throw new Error(`GTFS input does not exist: ${inputPath}`);
  }
  if (inputPath && !inputPath.toLowerCase().endsWith(".zip")) {
    return resolve(inputPath);
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "nyc-subway-gtfs-"));
  let zipPath = inputPath ? resolve(inputPath) : null;
  if (!zipPath) {
    zipPath = join(temporaryDirectory, "gtfs_subway.zip");
    console.log(`Downloading ${OFFICIAL_FEED_URL}`);
    const response = await fetch(OFFICIAL_FEED_URL);
    if (!response.ok) {
      throw new Error(`GTFS download failed with HTTP ${response.status}`);
    }
    await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
  }
  const extractedDirectory = join(temporaryDirectory, "feed");
  await mkdir(extractedDirectory, { recursive: true });
  execFileSync("unzip", ["-q", "-o", zipPath, "-d", extractedDirectory]);
  return extractedDirectory;
}

function assertRequiredFiles(directory) {
  for (const filename of [
    "feed_info.txt",
    "trips.txt",
    "stop_times.txt",
    "stops.txt",
    "shapes.txt",
  ]) {
    if (!existsSync(join(directory, filename))) {
      throw new Error(`Required GTFS file is missing: ${filename}`);
    }
  }
}

function validateArtifact(artifact) {
  for (const [patternId, pattern] of Object.entries(artifact.patterns)) {
    if (!artifact.shapes[pattern.shapeId]) {
      throw new Error(`${patternId} references missing shape ${pattern.shapeId}`);
    }
    if (
      pattern.stopIds.length === 0 ||
      pattern.stopIds.length !== pattern.stopDistances.length
    ) {
      throw new Error(`${patternId} has invalid stop anchors`);
    }
    for (let index = 1; index < pattern.stopDistances.length; index += 1) {
      if (pattern.stopDistances[index] < pattern.stopDistances[index - 1]) {
        throw new Error(`${patternId} has non-monotonic stop anchors`);
      }
    }
  }
  for (const [alias, patternId] of Object.entries(artifact.tripAliases)) {
    if (!artifact.patterns[patternId]) {
      throw new Error(`${alias} references missing pattern ${patternId}`);
    }
  }
}

async function build(inputDirectory) {
  assertRequiredFiles(inputDirectory);
  const [feedInfo] = await readCsv(join(inputDirectory, "feed_info.txt"));
  const stopRows = await readCsv(join(inputDirectory, "stops.txt"));
  const tripRows = await readCsv(join(inputDirectory, "trips.txt"));
  const shapeRows = await readCsv(join(inputDirectory, "shapes.txt"));

  const stops = new Map();
  for (const row of stopRows) {
    const latitude = finiteNumber(row.stop_lat);
    const longitude = finiteNumber(row.stop_lon);
    if (row.stop_id && latitude !== null && longitude !== null) {
      stops.set(row.stop_id, [latitude, longitude]);
    }
  }

  const shapes = new Map();
  for (const row of shapeRows) {
    const sequence = finiteNumber(row.shape_pt_sequence);
    const latitude = finiteNumber(row.shape_pt_lat);
    const longitude = finiteNumber(row.shape_pt_lon);
    if (
      !row.shape_id ||
      sequence === null ||
      latitude === null ||
      longitude === null
    ) {
      continue;
    }
    const points = shapes.get(row.shape_id) ?? [];
    points.push({ sequence, coordinate: [latitude, longitude] });
    shapes.set(row.shape_id, points);
  }
  const simplifiedShapes = new Map();
  for (const [shapeId, points] of shapes) {
    points.sort((left, right) => left.sequence - right.sequence);
    const coordinates = points.map((point) => point.coordinate);
    if (coordinates.length >= 2) {
      simplifiedShapes.set(
        shapeId,
        simplifyCoordinates(coordinates, SIMPLIFICATION_TOLERANCE_METERS).map(
          ([latitude, longitude]) => [
            Number(latitude.toFixed(6)),
            Number(longitude.toFixed(6)),
          ],
        ),
      );
    }
  }

  const trips = new Map();
  for (const row of tripRows) {
    const directionId = Number(row.direction_id);
    if (
      !row.route_id ||
      !row.trip_id ||
      !row.shape_id ||
      (directionId !== 0 && directionId !== 1)
    ) {
      continue;
    }
    trips.set(row.trip_id, {
      routeId: row.route_id,
      shapeId: row.shape_id,
      directionId,
      headsign: row.trip_headsign ?? "",
      alias: realtimeTripAlias(row.trip_id),
      stopIds: [],
    });
  }

  console.log(`Reading stop_times.txt for ${trips.size} trips`);
  await streamCsv(join(inputDirectory, "stop_times.txt"), (row) => {
    const trip = trips.get(row.trip_id);
    if (trip && row.stop_id) trip.stopIds.push(row.stop_id);
  });

  const patternGroups = new Map();
  for (const [tripId, trip] of trips) {
    if (trip.stopIds.length === 0 || !simplifiedShapes.has(trip.shapeId)) continue;
    const signature = [
      trip.routeId,
      trip.shapeId,
      trip.directionId,
      trip.stopIds.join(">"),
    ].join("|");
    const group = patternGroups.get(signature) ?? {
      ...trip,
      aliases: [],
      staticTripIds: [],
    };
    group.aliases.push(trip.alias);
    group.staticTripIds.push(tripId);
    patternGroups.set(signature, group);
  }

  const groupsByRoute = new Map();
  for (const group of patternGroups.values()) {
    const groups = groupsByRoute.get(group.routeId) ?? [];
    groups.push(group);
    groupsByRoute.set(group.routeId, groups);
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  const summary = [];
  for (const [routeId, groups] of [...groupsByRoute].sort(([left], [right]) =>
    left.localeCompare(right, undefined, { numeric: true }),
  )) {
    groups.sort(
      (left, right) =>
        left.shapeId.localeCompare(right.shapeId) ||
        left.directionId - right.directionId ||
        left.stopIds.join(">").localeCompare(right.stopIds.join(">")),
    );
    const artifact = {
      schemaVersion: 1,
      routeId,
      generatedAt: new Date().toISOString(),
      source: {
        url: OFFICIAL_FEED_URL,
        feedVersion: feedInfo?.feed_version ?? "",
        feedStartDate: feedInfo?.feed_start_date ?? "",
        feedEndDate: feedInfo?.feed_end_date ?? "",
      },
      shapes: {},
      patterns: {},
      tripAliases: {},
    };
    const aliases = new Map();
    const ambiguousAliases = new Set();
    const patternCountByShape = new Map();

    for (const group of groups) {
      const shapeCoordinates = simplifiedShapes.get(group.shapeId);
      const stopCoordinates = group.stopIds.map((stopId) => stops.get(stopId));
      if (!shapeCoordinates || stopCoordinates.some((coordinate) => !coordinate)) {
        continue;
      }
      const stopDistances = matchStopsToShape(stopCoordinates, shapeCoordinates);
      if (!stopDistances) {
        console.warn(
          `Skipping ${routeId} ${group.shapeId}: stop sequence could not be anchored`,
        );
        continue;
      }
      const shapePatternIndex = patternCountByShape.get(group.shapeId) ?? 0;
      patternCountByShape.set(group.shapeId, shapePatternIndex + 1);
      const patternId = `${group.shapeId}:${shapePatternIndex}`;
      artifact.shapes[group.shapeId] = { coordinates: shapeCoordinates };
      artifact.patterns[patternId] = {
        shapeId: group.shapeId,
        directionId: group.directionId,
        headsign: group.headsign,
        stopIds: group.stopIds,
        stopDistances,
      };
      for (const alias of group.aliases) {
        const existing = aliases.get(alias);
        if (existing && existing !== patternId) ambiguousAliases.add(alias);
        else aliases.set(alias, patternId);
      }
    }
    for (const [alias, patternId] of aliases) {
      if (!ambiguousAliases.has(alias)) artifact.tripAliases[alias] = patternId;
    }

    validateArtifact(artifact);
    const outputPath = join(OUTPUT_DIRECTORY, `${routeId}.json`);
    const serialized = JSON.stringify(artifact);
    await writeFile(outputPath, `${serialized}\n`);
    summary.push({
      routeId,
      shapes: Object.keys(artifact.shapes).length,
      patterns: Object.keys(artifact.patterns).length,
      aliases: Object.keys(artifact.tripAliases).length,
      bytes: Buffer.byteLength(serialized),
    });
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: OFFICIAL_FEED_URL,
    feedVersion: feedInfo?.feed_version ?? "",
    routes: summary,
  };
  await writeFile(
    join(OUTPUT_DIRECTORY, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.table(summary);
  console.log(
    `Generated ${summary.length} route artifacts in ${basename(OUTPUT_DIRECTORY)}`,
  );
}

const inputDirectory = await prepareInput(process.argv[2]);
await build(inputDirectory);
