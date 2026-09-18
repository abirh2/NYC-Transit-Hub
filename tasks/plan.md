# Implementation Plan: Nearby MTA Buses

## Overview

Extend `/nearby` into one proximity-ranked subway-and-bus experience, starting
from boardable static GTFS bus stops and then layering bounded SIRI
StopMonitoring predictions onto the nearest stop groups. A selected departure
opens the exact normalized bus trip in `/realtime`, where the existing detail
and map surfaces use the bus's actual reported position and transition honestly
when that departure reaches, passes, or disappears from the boarding stop.

This plan implements the approved capability map in dependency order:
`nearby-bus-stops` → `nearby-bus-realtime` → `nearby-bus-detail` →
`mixed-nearby-experience`.

## Architecture Decisions

- Discovery is stop-first. Static GTFS determines boardable locations and
  routes; vehicle coordinates never determine whether a bus is nearby.
- A rider-facing `NearbyBusStopGroup` may combine geographically adjacent,
  normalized same-name records, but every directional stop ID, coordinate, and
  route set remains intact. Group IDs are deterministic from sorted stop IDs.
- The current generated GTFS format does not contain trustworthy direction or
  ordered pattern data. Discovery keeps direction as `unknown` rather than
  inventing it; SIRI destination/headsign and per-stop predictions provide the
  rider-facing directional distinction.
- Nearby initially renders at most six location groups. The realtime endpoint
  accepts no more than twelve unique directional stop IDs, processes at most
  four upstream requests concurrently, and asks Bus Time for no more than six
  visits per stop. Named constants and dense-fixture tests make these limits
  explicit and adjustable from evidence.
- Bus Time StopMonitoring supports one `MonitoringRef` per request. The app
  therefore performs one server-side request per retained directional stop,
  isolates failures with settled results, and returns one health/result object
  per stop in the original request order.
- StopMonitoring requests use SIRI v2, `OperatorRef=MTA`, a calls-capable detail
  level, and the existing short realtime cache policy. Static stop discovery
  retains its longer independent cache policy.
- In StopMonitoring, `MonitoredCall` is the requested boarding stop while the
  first `OnwardCall` is normally the bus's actual next stop. The adapter models
  those roles separately and carries MTA `PresentableDistance`,
  `StopsFromCall`, and `DistanceFromCall` without deriving stops-away from GPS.
- `tripId` is the canonical URL and refresh identity for a selected bus.
  `vehicleId` is derived from the selected normalized trip and used when
  available; no second bus-only URL identity scheme is introduced.
- Actual SIRI coordinates remain `position.source = "actual"`. Bus markers do
  not enter the subway interpolation/projector path.
- Nearby owns one geolocation session and independent subway/bus async states.
  Bus failures remain local, polling updates are quiet, and mixed results sort
  by physical distance before their mode-specific departure content.
- The visual work extends the incumbent Nearby cards and shared detail shell.
  It reuses `BusBadge`, existing status surfaces, typography, spacing, and
  color tokens; route identity always has readable text and the map remains
  supplementary.

## External Source Notes

- MTA Bus Time StopMonitoring documents a single required monitoring stop,
  bounded visit/call parameters, and the distinct meaning of `MonitoredCall`
  and `OnwardCalls`:
  <https://bustime-classic.mta.info/wiki/Developers/SIRIStopMonitoring>
- MTA's monitored-journey contract defines exact trip/vehicle identity,
  reported vehicle coordinates, and distance/progress extensions:
  <https://bustime-classic.mta.info/wiki/Developers/SIRIMonitoredVehicleJourney>
- MTA warns against frequent/unfiltered VehicleMonitoring requests, reinforcing
  the existing 30-second cache/poll cadence:
  <https://bustime-classic.mta.info/wiki/Developers/SIRIVehicleMonitoring>
- MTA's OneBusAway API is static-only for this deployment; realtime remains on
  SIRI and no new integration is needed:
  <https://bustime-classic.mta.info/wiki/Developers/OneBusAwayRESTfulAPI>

## Task List

### Phase 1: Nearby stop groups

- [x] Task 1: Define deterministic bus-stop grouping and ranking contracts with
  red-first dense-location fixtures.
- [x] Task 2: Expose grouped stop discovery through a validated, cacheable API
  contract without changing subway discovery.

### Checkpoint: Stop discovery

- [x] Same-location records produce fewer cards while retaining every source
  stop ID, coordinate, route association, and conservative direction value.
- [x] Requested radius/group limits are deterministic and malformed coordinates
  fail at the HTTP boundary.
- [x] Focused stop tests, lint, and typecheck pass.

### Phase 2: Bounded stop realtime

- [x] Task 3: Correct the SIRI v2 boundary and normalize boarding-stop progress,
  actual next stop, MTA progress copy, stops-away, and actual vehicle position.
- [x] Task 4: Add bounded multi-stop orchestration with stable deduplication,
  independent source health, and partial-failure isolation.
- [x] Task 5: Add the nearby-bus realtime route with strict request and response
  contracts plus independent realtime caching.

### Checkpoint: Stop predictions

- [x] Every returned departure resolves to its exact normalized trip and, when
  supplied, the matching vehicle.
- [x] A twelve-stop request never exceeds four concurrent upstream calls or six
  retained visits per stop, and one failure does not erase successful results.
- [x] Passed predictions disappear; empty, stale, unavailable, malformed, and
  successful stop states remain distinguishable.
- [x] Adapter, service, route, lint, typecheck, and production build checks pass.

### Phase 3: Exact bus detail

- [x] Task 6: Define and test the selected-bus lifecycle/detail model, including
  reordered refreshes, at-stop, passed, disappeared, stale, and following-bus
  states.
- [x] Task 7: Hydrate normalized bus snapshots in `/realtime` and resolve bus
  selection/following departures by canonical trip identity.
- [x] Task 8: Render and focus the selected bus from actual coordinates alongside
  its boarding stop, with a full-route escape that preserves route context.

### Checkpoint: Exact bus tracking

- [x] A Nearby link, direct URL, refresh, and following-bus selection all restore
  the intended trip rather than guessing by route, vehicle order, or ETA.
- [x] Reached/passed/disappeared buses never retain a frozen approaching ETA.
- [x] Bus map positioning is demonstrably actual; subway projection remains
  unchanged.
- [x] Detail, payload, map, deep-link, lint, typecheck, and build checks pass.

### Phase 4: Mixed Nearby experience

- [x] Task 9: Add mode-neutral location sorting and next-departure selection with
  deterministic mixed-mode tests.
- [x] Task 10: Build accessible shared location and bus-departure card surfaces
  in the incumbent Nearby visual language.
- [x] Task 11: Integrate one geolocation session, All/Subway/Bus filtering,
  bounded bus loading/polling, expansion, and isolated mode failures.
- [x] Task 12: Verify and polish the complete desktop/mobile rider journey,
  performance bounds, documentation, and subway regressions.

### Final checkpoint

- [x] Dense Manhattan fixtures render no more than six initial location cards
  and request no more than twelve directional bus stops per refresh.
- [x] Keyboard, focus, accessible-name, reduced-motion, non-color identity,
  overflow, loading, empty, stale, and partial-error checks pass.
- [x] Exact bus selection, actual marker movement, following buses, browser back,
  and a bus-outage/subway-success flow pass in Playwright and a real browser.
- [x] `npm run lint`, `npx tsc --noEmit`, focused tests, full tests,
  `npm run build`, and the relevant Playwright spec pass on Node 24.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Dense intersections contain many near-duplicate stop records | High | Group only normalized same-name stops within a tested proximity threshold, retain every stop internally, and limit after grouping. |
| StopMonitoring requires one upstream call per directional stop | High | Cap unique stop IDs at twelve, use concurrency four, retain six visits per stop, share the 30-second server cache, and test request counts. |
| `MonitoredCall` is mistaken for the bus's actual next stop | High | Model boarding call and first onward call separately from sanitized official-shape fixtures. |
| Block assignments make the vehicle's current trip differ from the predicted trip | Medium | Treat `tripId` as selection identity and vehicle as a related optional entity, never as a substitute trip key. |
| The selected prediction disappears between polls | Medium | Resolve a lifecycle state from the previous selection and current snapshot, remove stale ETA copy, and offer subsequent departures. |
| Partial SIRI failure creates a blank Nearby page | High | Preserve independent stop and mode states; successful bus stops and all subway results remain usable. |
| Mixed cards become visually dense or inaccessible | Medium | Lead with one departure, progressively disclose more, reuse incumbent tokens/components, and inspect real desktop/mobile focus and overflow. |
| Added polling increases browser or upstream load | Medium | Send one client request for a bounded group of stops, cache upstream calls server-side, pause irrelevant mode polling, and verify network counts. |

## Deferred Work

- Walking-time-plus-wait-time recommendation scoring.
- Changing the generated static bus GTFS artifact format to include ordered
  patterns or inferred cardinal directions.
- A breaking URL parameter redesign or a bus-only replacement for the shared
  detail shell.

## Open Questions

- None blocking. The compact presentation of multiple directional stops inside
  a grouped card will be chosen during browser verification from inline labels
  versus a secondary selector, without changing the approved data contract.

---

## Phase 5 Addendum: Map-first Nearby UX

### Overview

Replace the completed Phase 4 dashboard-shaped presentation with the service-
first contract in `SPEC-nearby-map-first-experience.md`. Data boundaries,
polling, normalized identities, and `/realtime` detail routing remain unchanged.

### Architecture Decisions

- Derive a small `NearbyService` presentation model from existing normalized
  departures; do not add an API or duplicate transit domain contracts.
- Introduce a lightweight Nearby map on the existing Leaflet stack. Reuse
  basemaps, markers, route colors, subway geometry, and actual bus positions.
- Keep first-press selection in `/nearby`; keep exact detail navigation as a
  separate sibling link to avoid nested interactive elements.
- Use a mobile map-over-results stack and a desktop sticky-map/results split.

### Task List

**Correction:** The subway panel is route-first. Render one card per route, and
scope each card's directional swipe/tab state to that route only.

- [x] Task 13: Specify and test service-first grouping and ordering.
- [x] Task 14: Build the contextual Nearby map and map/list selection contract.
- [x] Task 15: Replace ranked/nested cards with flat selectable departure rows
  and remove redundant route-page chrome.
- [x] Task 16: Cover states, mobile/desktop behavior, exact deep links, and
  perform bounded Impeccable/browser finish verification.

### Checkpoint: Map and service contract

- [x] Unit/component tests pass and normalized trip/vehicle identities remain
  intact.
- [x] A selection changes both the row state and map context.

### Checkpoint: Complete

- [x] The first mobile viewport answers location, nearby transit, and next
  arrival without a numbered stop list.
- [x] Lint, typecheck, full tests, production build, and relevant E2E pass.

### Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Leaflet captures mobile scrolling | High | Keep map height bounded, disable scroll-wheel zoom, and preserve vertical page gestures. |
| Map selection loses exact identity | High | Key selection by mode + `tripId`; resolve bus vehicles only through normalized trip relationships. |
| Route geometry increases initial work | Medium | Load only the selected route's existing compact geometry artifact. |
| Flat rows hide resilience states | Medium | Keep localized mode status copy and a compact shared freshness treatment. |

### Open Questions

- None blocking; the user supplied a complete hierarchy and interaction brief
  and requested uninterrupted execution.

---

## Phase 6 Addendum: Primary Subway Interaction

### Overview

Implement the Primary Subway Interaction addendum in
`SPEC-nearby-map-first-experience.md` as a focused extension of the completed
map-first pass. Direction paging is presentation state over existing departures;
exact train selection continues to use normalized Trip identity and the current
map/detail infrastructure.

### Architecture Decisions

- Add one presentational `NearbySubwayServicePanel` that owns direction paging
  and per-direction progressive disclosure. It receives normalized departures
  and emits the exact selected departure.
- Keep realtime fetching, station selection, mode failure isolation, and map
  synchronization in `NearbyClient`.
- Render the subway panel before bus service rows for All/Subway modes; do not
  rebuild the general bus presentation.
- Separate passive default map context from explicit train expansion so Nearby
  does not open in an expanded state automatically.
- Extend `NearbyMap` with a bounded expanded state and subtle same-route train
  markers derived only through existing GTFS geometry/projectors.

### Task List

- [x] Task 17: Specify the directional service panel through failing component
  tests, then implement swipe/tab paging, one hero, compact exact-trip times,
  and retained disclosure state.
- [x] Task 18: Integrate the panel with selected-station state and exact train
  selection; expand/collapse map prominence and add subtle same-route trains.
- [x] Task 19: Extend the Nearby browser flow and complete one bounded
  mobile/desktop Impeccable review and correction pass.

### Checkpoint: Directional service panel

- [x] Component tests prove whole-context direction switching, dominant hero
  content, hidden/expanded secondary times, exact links, and no raw IDs.
- [x] Existing bus rows and mode filtering remain functional.

### Checkpoint: Selected train map state

- [x] Hero selection resolves the exact normalized Trip, expands the map, and
  preserves upcoming times below it.
- [x] The selected train, boarding station, route, user location, and subtle
  same-route trains are represented without fabricated coordinates.

### Checkpoint: Complete

- [x] Focused tests, lint, typecheck, production build, and relevant Playwright
  tests pass on Node 24.
- [x] The bounded mobile/desktop review has no unresolved material finding in
  the implemented scope.

### Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Horizontal paging steals vertical scroll | High | Use native snap scrolling, non-blocking scroll observation, and browser-test mixed-axis gestures. |
| Refresh reorders pages or loses expansion | Medium | Use stable direction keys and store expansion by direction rather than page index. |
| Default service selection falsely implies an expanded train | Medium | Track explicit expanded `tripId` separately from passive map context. |
| Other train markers imply GPS precision | High | Project only positionable normalized trips through existing estimated geometry and render them with lower emphasis. |

### Open Questions

- None blocking.
