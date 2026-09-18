# Individual Realtime Subway Trains

## Task 1: Active-trip query helpers

**Acceptance criteria:**
- [x] Trips filter by route and normalized direction without losing ID.
- [x] Trip lookup and following departures return canonical normalized objects.

**Verification:**
- [x] Focused Vitest domain tests pass.

**Dependencies:** None

## Task 2: Estimated position projector

**Acceptance criteria:**
- [x] Progress and geographic projection are separate functions.
- [x] At-stop, approaching, between-stop, and unknown states degrade conservatively.

**Verification:**
- [x] Focused positioning tests pass.

**Dependencies:** Task 1

## Task 3: Normalized realtime client state

**Acceptance criteria:**
- [x] `/realtime` consumes trips, departures, vehicles, source state, and feed time.
- [x] Refresh preserves stable Trip identity and selection.

**Verification:**
- [x] Component tests and typecheck pass.

**Dependencies:** Tasks 1-2

## Task 4: Trip deep links and following trains

**Acceptance criteria:**
- [x] Valid encoded trip IDs restore exact selection.
- [x] Expired IDs render a useful notice while retaining route context.
- [x] Following trains select by underlying trip ID.

**Verification:**
- [x] Deep-link and detail interaction tests pass.

**Dependencies:** Task 3

## Task 5: Individual map markers

**Acceptance criteria:**
- [x] Every active trip has one stable marker keyed by trip ID.
- [x] Selected, same-route, and contextual visual priorities are distinct.
- [x] Subway position copy says estimated, never GPS.

**Verification:**
- [x] Map/unit tests and desktop/mobile browser checks pass.

**Dependencies:** Tasks 2-4

## Task 6: Selected-train detail

**Acceptance criteria:**
- [x] Detail shows direction, destination, progress state, adjacent/upcoming stops, ETA, and freshness.
- [x] Stop sequence distinguishes completed and upcoming stops without an unbounded list.

**Verification:**
- [x] Detail component tests pass in desktop and bottom-sheet shells.

**Dependencies:** Tasks 3-4

## Task 7: Directional line diagram

**Acceptance criteria:**
- [x] Individual trips occupy direction-specific lanes.
- [x] Selected trip and its next-stop relationship are emphasized without relying on color alone.

**Verification:**
- [x] Line diagram tests and browser checks pass.

**Dependencies:** Tasks 3-6

## Final checkpoint

- [x] `npm run lint`
- [x] `npx tsc --noEmit`
- [x] `npm run test`
- [x] `npm run build`
- [x] Relevant Playwright/browser flow verified.

# Official GTFS Subway Geometry

## Task 8: Geometry contract and deterministic fixtures

**Acceptance criteria:**
- [x] Exact trip aliases resolve to the corresponding static service pattern.
- [x] Direction/branch fallback uses ordered stops and never a route-only polyline assumption.
- [x] Stop-to-shape anchors are monotonic and train interpolation stays within the adjacent-stop shape segment.

**Verification:**
- [x] Focused geometry tests fail before implementation and pass afterward.

**Dependencies:** Individual realtime subway train phase

## Task 9: Offline official-GTFS preprocessing

**Acceptance criteria:**
- [x] Generator consumes verified MTA `trips.txt`, `stop_times.txt`, `stops.txt`, and `shapes.txt` relationships.
- [x] Output is split by route and records feed provenance/version.
- [x] Malformed rows/shapes are rejected or skipped with actionable diagnostics.

**Verification:**
- [x] Generator completes against the downloaded official feed and validates every emitted artifact.

**Dependencies:** Task 8

## Task 10: Static geometry loading and caching

**Acceptance criteria:**
- [x] Only the selected route's compact geometry is downloaded.
- [x] Geometry cache lifetime is independent from 30-second realtime polling.
- [x] Missing or malformed artifacts degrade to the station-derived fallback.

**Verification:**
- [x] Loader/cache tests pass and route changes do not refetch an already cached artifact.

**Dependencies:** Task 9

## Task 11: Shape-aware Leaflet rendering and projection

**Acceptance criteria:**
- [x] Selected trips render only their resolved service shape; unselected route views deduplicate active variants.
- [x] Individual train markers interpolate between monotonic stop anchors on the resolved shape.
- [x] Bus and commuter-rail rendering/positioning paths remain unchanged.

**Verification:**
- [ ] Map/unit tests and representative browser checks pass (local server bind blocked by sandbox).

**Dependencies:** Tasks 8-10

## Task 12: Geometry operations documentation

**Acceptance criteria:**
- [x] Data source, resolver hierarchy, preprocessing, caching, refresh command, and limitations are documented.
- [x] Transit-domain and component docs distinguish geographic shapes from schematic topology.

**Verification:**
- [x] Documentation commands, paths, and claims match the implementation.

**Dependencies:** Tasks 9-11

## GTFS geometry final checkpoint

- [x] `npm run lint` (bundled Node; existing warnings only)
- [x] `npx tsc --noEmit` (bundled Node)
- [x] Focused geometry and realtime tests
- [x] `npm run test` (44 files, 467 tests)
- [x] `npm run build` (offline MTA fetch warnings only)
- [ ] Simple, express/shared-track, and branched routes visually verified.
