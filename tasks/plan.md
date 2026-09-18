# Implementation Plan: Individual Realtime Subway Trains

## Overview

Upgrade `/realtime` to consume the normalized subway snapshot directly so each
active train remains a stable, selectable Trip across the map, line diagram,
detail surface, URL reloads, and refreshes. Keep position semantics explicitly
estimated and isolate trip progress from geographic projection so future GTFS
shape geometry can replace only the projector.

## Architecture Decisions

- `SubwayTrip.id` is the only subway train identity. UI components receive
  normalized trips/departures rather than rebuilding identity from legacy ETAs.
- Trip progress is derived at the adapter/domain boundary. A separate projector
  maps that progress onto the existing ordered-station geometry.
- URL `trip` selection survives refresh by ID. A missing trip keeps route and
  direction context and renders a non-crashing expired-selection notice.
- Following departures retain their `tripId` and select that exact trip.

## Task List

### Phase 1: Domain and projection foundation

- [x] Task 1: Add active-trip query helpers and focused identity/progress tests.
- [x] Task 2: Add a conservative trip-progress-to-route-geometry projector and tests.

### Checkpoint: Foundation

- [x] Focused domain and positioning tests pass.
- [x] Types compile for the normalized contracts.

### Phase 2: Realtime selection flow

- [x] Task 3: Hydrate and retain full normalized subway snapshots in `/realtime`.
- [x] Task 4: Resolve deep links, stale trips, and following trains by `tripId`.

### Checkpoint: Selection

- [x] Valid trip URLs restore the exact trip.
- [x] Expired trip URLs retain useful route context without crashing.

### Phase 3: Individual-train experience

- [x] Task 5: Render every active subway trip as a stable map marker.
- [x] Task 6: Add selected-trip progress, stop sequence, freshness, and following trains to the shared detail surface.
- [x] Task 7: Upgrade the line diagram to direction lanes and individual selected/peer train markers.

### Checkpoint: Complete

- [x] Desktop detail panel and mobile bottom sheet work.
- [x] Refresh preserves marker identity and selection.
- [x] Lint, typecheck, tests, production build, and relevant browser checks pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| MTA vehicle entities omit position/progress fields | Medium | Prefer explicit progress states, fall back to timing inference, and expose uncertainty. |
| Ordered route stations do not model branches perfectly | Medium | Project only between known adjacent stops and document branch limitations. |
| A trip disappears during polling | Medium | Preserve URL route/direction and show an expired-trip notice instead of clearing selection. |
| Full snapshots increase client payload | Low | Route-filter server-side and keep the existing 30-second cache/poll cadence. |

## Open Questions

- None blocking. Full GTFS shape/topology remains intentionally deferred to Step 7.

## Phase 4: Official GTFS Subway Geometry

### Architecture Decisions

- Preprocess the official MTA subway schedule feed offline. Browser code loads
  compact, route-scoped geometry artifacts and never parses raw GTFS tables.
- Resolve a realtime trip through an exact static-trip alias first, then score
  route/direction/service patterns from the ordered realtime stop sequence.
- Store stop anchors as monotonic distances along a shape. Train projection
  interpolates between the previous and next stop anchors, so crossings and
  nearby parallel segments cannot be selected by a global nearest-point lookup.
- Keep station-derived geometry as a final fallback and leave bus/rail
  positioning paths unchanged.

### Task List

- [ ] Task 8: Define and test the route-geometry resolver/projection contract.
- [ ] Task 9: Generate route-scoped subway shape and service-pattern artifacts.
- [ ] Task 10: Load geometry with a static-data cache independent of realtime polling.
- [ ] Task 11: Render resolved shapes and shape-aware individual train positions.
- [ ] Task 12: Document refresh, caching, fallbacks, and known topology limits.

### Checkpoint: GTFS geometry

- [ ] Simple, bidirectional, branched, shared-corridor, terminal, malformed,
  and unresolved cases pass deterministic tests.
- [ ] Representative simple, express/shared-track, and branched routes are
  visually verified in a real browser.
- [ ] Lint, typecheck, geometry/realtime tests, and production build pass.

### Additional Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Static and realtime trip IDs use schedule-version prefixes differently | High | Generate MTA realtime aliases from the authoritative static trip IDs; fall back to ordered-stop pattern scoring. |
| `stop_times.txt` omits `shape_dist_traveled` | High | Precompute monotonic stop anchors against each ordered shape during generation. |
| Route variants inflate the client bundle | High | Split generated artifacts by route and fetch only the selected route with long-lived static caching. |
| Planned diversions are absent from the regular static feed | Medium | Preserve route/direction and station-derived fallbacks; report unresolved cases without breaking the tracker. |
