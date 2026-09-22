# Nearby MTA Buses

Implementation begins only after this plan receives human approval. Each task
is a thin TDD slice and should keep its production/test change to five files or
fewer. Mark acceptance and verification items as they are completed.

> Phase 5 map-first UX work is approved by the user's 2026-09-18 brief and is
> tracked below after the completed Phase 1–4 tasks.

## Task 1: Deterministic bus-stop groups

**Files:** `types/transit.ts`, `lib/gtfs/bus-stops.ts`,
`tests/unit/nearby-bus-stops.test.ts`

**Acceptance criteria:**
- [x] Write failing fixtures for duplicate records, opposite-side stops,
  same-intersection stops, same-name distant stops, and a dense Manhattan area.
- [x] Add a `NearbyBusStopGroup` contract whose stable ID derives from sorted
  retained stop IDs.
- [x] Group only normalized same-name stops within a named, fixture-backed
  proximity threshold.
- [x] Preserve each stop's ID, coordinates, route IDs, and `unknown` direction;
  expose the group's deduplicated sorted route union and nearest distance.
- [x] Apply the rider-facing result limit after grouping with deterministic
  distance/name/ID tie-breaking.

**Verification:**
- [x] `nvm use 24 && npx vitest run tests/unit/nearby-bus-stops.test.ts`

**Dependencies:** None

## Task 2: Grouped stop discovery API

**Files:** `types/api.ts`, `app/api/buses/stops/route.ts`,
`tests/unit/nearby-bus-stops-route.test.ts`

**Acceptance criteria:**
- [x] Write failing route tests for valid coordinates, malformed values,
  radius bounds, and clamped group limits.
- [x] Return only grouped rider-facing results; never serialize the full stop
  dataset.
- [x] Preserve the existing long static-data cache policy and document the
  response type additively.
- [x] Leave subway Nearby lookup and contracts unchanged.

**Verification:**
- [x] Focused route and Task 1 tests pass.
- [x] `nvm use 24 && npm run lint`
- [x] `nvm use 24 && npx tsc --noEmit`

**Dependencies:** Task 1

## Task 3: SIRI v2 boarding-progress normalization

**Files:** `lib/mta/buses.ts`, `lib/transit/bus-adapter.ts`,
`types/transit.ts`, `tests/fixtures/siri-stop-monitoring.json`,
`tests/unit/transit-adapters.test.ts`

**Acceptance criteria:**
- [x] Add a failing sanitized fixture covering `MonitoredCall`, first and later
  `OnwardCall`s, `PresentableDistance`, `StopsFromCall`, `DistanceFromCall`,
  `VehicleAtStop`, missing optional fields, and unknown extensions.
- [x] Request SIRI v2 with `OperatorRef=MTA`, calls detail, and bounded visit and
  onward-call parameters without exposing the API key.
- [x] Model the monitored boarding stop separately from the actual next stop;
  preserve their names, IDs, sequence, and predicted times.
- [x] Normalize rider-facing progress and stops-away only from SIRI fields, not
  straight-line distance.
- [x] Preserve trip ID, optional vehicle ID, recorded time, and actual vehicle
  coordinates with internally consistent departure → trip → vehicle links.
- [x] Filter past predictions against the injected clock and classify stale,
  empty, malformed, unavailable, and successful snapshots explicitly.

**Verification:**
- [x] `nvm use 24 && npx vitest run tests/unit/transit-adapters.test.ts`

**Dependencies:** Task 2

## Task 4: Bounded multi-stop realtime service

**Files:** `lib/transit/nearby-bus-service.ts`,
`lib/transit/realtime-service.ts`, `types/transit.ts`,
`tests/unit/nearby-bus-realtime.test.ts`

**Acceptance criteria:**
- [x] Write failing clock-controlled tests for chronological multi-route
  predictions, duplicate IDs, reordered payloads, one failed stop, stale/empty
  neighbors, and passed/disappeared predictions.
- [x] Deduplicate and cap input at twelve unique stop IDs while preserving first
  request order.
- [x] Execute at most four stop fetches concurrently and retain at most six
  future/current departures per stop.
- [x] Return one settled result per stop so a rejected or malformed response
  cannot fail successful stops.
- [x] Preserve stable departure, trip, and vehicle identity during snapshot
  merge and sort departures chronologically.

**Verification:**
- [x] `nvm use 24 && npx vitest run tests/unit/nearby-bus-realtime.test.ts tests/unit/transit-adapters.test.ts`

**Dependencies:** Task 3

## Task 5: Nearby bus realtime API

**Files:** `types/api.ts`, `app/api/buses/nearby/route.ts`,
`tests/unit/nearby-bus-realtime-route.test.ts`

**Acceptance criteria:**
- [x] Write failing route tests for repeated stop IDs, duplicates, empty input,
  excess input, invalid IDs, and partial upstream failure.
- [x] Accept a bounded list of directional stop IDs and return one typed result
  per accepted stop in request order.
- [x] Serialize dates consistently with existing client-payload conventions.
- [x] Use the short realtime cache policy independently of the stop-discovery
  endpoint's static cache.
- [x] Include aggregate generation/freshness metadata without collapsing the
  individual stop source states.

**Verification:**
- [x] Focused Task 3-5 tests pass.
- [x] `nvm use 24 && npm run lint`
- [x] `nvm use 24 && npx tsc --noEmit`
- [x] `nvm use 24 && npm run build`

**Dependencies:** Task 4

## Task 6: Selected-bus lifecycle and detail model

**Files:** `lib/transit/bus-trip-detail.ts`,
`tests/unit/bus-trip-detail.test.ts`

**Acceptance criteria:**
- [x] Write failing tests for exact trip selection, reordered refreshes,
  approaching, at-stop, passed, disappeared, stale, and following-bus states.
- [x] Resolve the selected trip by `tripId`; relate a vehicle only through the
  normalized trip's optional `vehicleId`.
- [x] Build framework-free detail data for route, destination, boarding stop,
  actual next stop, ETA, progress/stops-away, freshness, and following buses.
- [x] Remove the prior ETA in passed/disappeared states and provide accessible
  explanatory copy plus subsequent departures.
- [x] Sort following buses chronologically and preserve their exact trip IDs.

**Verification:**
- [x] `nvm use 24 && npx vitest run tests/unit/bus-trip-detail.test.ts`

**Dependencies:** Task 5

## Task 7: Normalized bus selection in Live Tracker

**Files:** `lib/transit/realtime-client-payload.ts`,
`app/realtime/RealtimeClient.tsx`,
`components/realtime/TransitDetailPanel.tsx`,
`tests/components/TransitDetailPanel.test.tsx`,
`tests/unit/realtime-client-payload.test.ts`

**Acceptance criteria:**
- [x] Write failing payload/detail tests before integrating the client.
- [x] Hydrate normalized bus departures, trips, vehicles, source state, and feed
  time while retaining legacy arrivals for unaffected consumers.
- [x] Restore selection from the existing `trip` parameter and keep route/stop
  context when the trip is no longer active.
- [x] Render the Task 6 lifecycle model in both desktop detail and mobile sheet
  shells without changing subway behavior.
- [x] Following-bus controls are keyboard operable, have specific accessible
  names, and select the underlying exact trip.

**Verification:**
- [x] Payload, detail, and deep-link tests pass.
- [x] `nvm use 24 && npx tsc --noEmit`

**Dependencies:** Task 6

## Task 8: Actual bus map focus

**Files:** `components/realtime/map/RealtimeMap.tsx`,
`components/realtime/map/RealtimeMapCanvas.tsx`,
`components/realtime/map/markerIcons.ts`,
`tests/unit/marker-icons.test.ts`, `tests/components/RealtimeMap.test.tsx`

**Acceptance criteria:**
- [x] Write failing tests proving a selected bus marker receives the normalized
  vehicle's exact latitude/longitude and never a subway projection.
- [x] Visually prioritize the selected bus with text/shape/state cues that do
  not rely on color alone.
- [x] Initial focused bounds include the actual selected bus and boarding stop,
  with sensible one-point fallback.
- [x] “View full route” clears focused framing while retaining route selection.
- [x] Missing vehicle position leaves detail usable and avoids a fabricated map
  location.

**Verification:**
- [x] Focused map tests pass.
- [x] Subway, bus-route, and rail map regressions remain green.
- [x] `nvm use 24 && npm run lint`
- [x] `nvm use 24 && npx tsc --noEmit`

**Dependencies:** Task 7

## Task 9: Mixed Nearby domain model

**Files:** `lib/transit/nearby.ts`, `types/transit.ts`,
`tests/unit/nearby.test.ts`

**Acceptance criteria:**
- [x] Write failing tests for subway-only, bus-only, equal-distance, and mixed
  locations plus chronological bus departure selection.
- [x] Add a discriminated `NearbyLocation` union without forcing bus groups into
  subway station semantics.
- [x] Sort primarily by physical distance with deterministic mode/name/ID
  tie-breaking.
- [x] Select one useful primary bus departure and ordered additional arrivals
  without losing trip/vehicle identity.
- [x] Reuse the existing distance and approximate walking-time convention.

**Verification:**
- [x] `nvm use 24 && npx vitest run tests/unit/nearby.test.ts`

**Dependencies:** Tasks 2 and 5

## Task 10: Accessible Nearby location cards

**Files:** `components/nearby/NearbyLocationCard.tsx`,
`components/nearby/BusDepartureCard.tsx`,
`tests/components/NearbyBusCard.test.tsx`,
`tests/components/NearbyLocationCard.test.tsx`

**Acceptance criteria:**
- [x] Write failing component tests for one-route, multi-route,
  opposite-direction, expanded, stale, empty, and partial-error bus content.
- [x] Reuse incumbent card hierarchy, `BusBadge`, typography, spacing, color
  tokens, status surfaces, and motion conventions.
- [x] Lead bus content with route, destination, ETA, and progress/stops-away;
  disclose additional chronological arrivals on demand.
- [x] Keep route text visible, make card/expansion/arrival controls keyboard
  operable, and avoid announcing every polling update.
- [x] Preserve bus-specific destination semantics and subway-specific direction
  tabs rather than over-generalizing them.

**Verification:**
- [x] Focused card tests pass with accessibility queries.

**Dependencies:** Task 9

## Task 11: Unified Nearby orchestration

**Files:** `components/nearby/NearbyClient.tsx`, `app/nearby/page.tsx`,
`tests/components/NearbyClient.test.tsx`,
`tests/e2e/nearby-bus.spec.ts`

**Acceptance criteria:**
- [x] Write failing component scenarios for one geolocation request, mixed sort,
  All/Subway/Bus filters, expansion, exact-trip navigation, and independent
  mode failures.
- [x] Reuse one geolocation result while loading subway discovery and grouped
  bus discovery independently.
- [x] Fetch realtime in one client request for only the retained visible bus
  groups, never more than twelve unique stop IDs.
- [x] Poll at the existing realtime cadence only while bus content is relevant;
  preserve stable cards and expansion state across reordered refresh payloads.
- [x] Keep usable subway results during bus failure and usable bus results
  during subway failure, with localized retry/status copy.
- [x] Default to proximity-sorted All and offer lightweight All/Subway/Bus
  controls without a mandatory route picker.

**Verification:**
- [x] Nearby component tests pass.
- [x] Focused E2E compiles and deterministic mocked flows pass.

**Dependencies:** Tasks 8-10

## Task 12: End-to-end quality, performance, and documentation

**Files:** `tests/e2e/nearby-bus.spec.ts`, `docs/api.md`,
`docs/components.md`, `docs/architecture.md`, `docs/ai/transit-domain.md`

**Acceptance criteria:**
- [x] Extend E2E coverage for dense results, exact selection, actual marker
  movement, following buses, full-route transition, browser back, bus outage,
  and subway regression on desktop and mobile.
- [x] Verify six-card/twelve-stop/four-concurrent/six-visit bounds with concrete
  assertions rather than visual inference.
- [x] Inspect focus order, names, live regions, reduced motion, overflow,
  loading/empty/stale/error states, and non-color route identity in a real
  browser using the Impeccable craft floor.
- [x] Check console and network activity for runtime errors, hydration issues,
  duplicate requests, or unintended polling.
- [x] Document the stop-first flow, endpoint contracts, identity/lifecycle
  semantics, cache separation, limits, source provenance, and failure model.

**Verification:**
- [x] `nvm use 24 && npm run lint`
- [x] `nvm use 24 && npx tsc --noEmit`
- [x] `nvm use 24 && npm run test`
- [x] `nvm use 24 && npm run build`
- [x] `nvm use 24 && npx playwright test tests/e2e/nearby-bus.spec.ts`
- [x] Desktop and mobile real-browser inspection passes without console errors,
  inaccessible controls, overflow, or duplicate network work.

**Dependencies:** Tasks 1-11

## Final checkpoint

- [x] Every acceptance item above is complete.
- [x] All four approved module success criteria are traceable to tests.
- [x] Static GTFS and realtime SIRI cache lifecycles remain independent.
- [x] Existing subway Nearby and Live Tracker flows remain intact.
- [x] No generated PWA file, secret, or unrelated user change was modified.

---

# Map-first Nearby UX

## Task 13: Service-first presentation model

**Files:** `lib/transit/nearby.ts`, `tests/unit/nearby.test.ts`

**Acceptance criteria:**
- [x] Write failing tests for subway route/direction grouping, bus route and
  destination grouping, past-departure removal, deduplication, stable
  proximity ordering, and exact primary Trip identity.
- [x] Return flat subway and bus services with location metadata and ordered
  related departures without changing normalized domain types.
- [x] Keep route, direction, stop/station, distance, and exact Trip identity.

**Verification:**
- [x] `nvm use 24 && npx vitest run tests/unit/nearby.test.ts`

**Dependencies:** Task 12

## Task 14: Contextual map and synchronization

**Files:** `components/nearby/NearbyMap.tsx`,
`components/nearby/NearbyMapCanvas.tsx`,
`components/nearby/NearbyClient.tsx`

**Acceptance criteria:**
- [x] Render user location plus bounded nearby stations and bus groups on the
  existing Leaflet/CARTO stack.
- [x] Add only selected subway route geometry/train position or selected bus
  route/actual vehicle context.
- [x] Map object selection focuses and scrolls to a related service row; row
  selection updates map framing without navigating.

**Verification:**
- [x] Typecheck passes and the 390×844 browser view preserves vertical page
  scrolling, bottom-nav clearance, and usable map controls.

**Dependencies:** Task 13

## Task 15: Flat departure hierarchy

**Files:** `components/nearby/NearbyDepartureRow.tsx`,
`components/nearby/NearbyClient.tsx`, `app/nearby/page.tsx`,
`tests/components/NearbyDepartureRow.test.tsx`

**Acceptance criteria:**
- [x] Write a failing component test for dominant ETA, supporting stop copy,
  in-place first selection, and exact explicit detail links.
- [x] Remove the page description, large location surface, numbered location
  list, nested cards, raw Trip copy, and dominant filters from the primary flow.
- [x] Add a floating `/routes` destination affordance and consistent subway/bus
  row grammar with ≥44px controls and visible focus.

**Verification:**
- [x] Focused component and unit tests pass.

**Dependencies:** Tasks 13–14

## Task 16: States and end-to-end finish

**Files:** `components/nearby/NearbyClient.tsx`,
`tests/e2e/nearby-bus.spec.ts`, `docs/components.md`

**Acceptance criteria:**
- [x] Preserve denied, loading, empty, partial, stale, and total-error behavior
  in the map/results composition.
- [x] E2E proves map-first ordering, mixed services, in-place selection, compact
  filtering, destination routing, exact bus detail link, and no mobile overflow.
- [x] Complete one batched desktop/mobile Impeccable inspection, one fix batch,
  and at most one confirmation round.

**Verification:**
- [x] `nvm use 24 && npm run lint`
- [x] `nvm use 24 && npx tsc --noEmit`
- [x] `nvm use 24 && npm run test`
- [x] `nvm use 24 && npm run build`
- [x] `nvm use 24 && npx playwright test tests/e2e/nearby-bus.spec.ts`

**Dependencies:** Tasks 13–15

## Phase 5 final checkpoint

- [x] First mobile viewport shows map context and useful service without a
  ranked station list.
- [x] Selection synchronizes row and map while explicit detail actions retain
  exact Trip/Vehicle routing.
- [x] All automated and bounded browser checks pass.

---

## Task 17: Build the directional subway service panel

**Description:** Replace selected-station subway rows with one station-local,
swipeable directional surface whose hero is an exact departure and whose other
times expand compactly.

**Acceptance criteria:**
- [x] Direction tabs and native snap pages switch the complete rider context.
- [x] One hero ETA dominates and normal copy exposes no internal identifier.
- [x] More times remain hidden until requested, retain state per direction, and
  every displayed time preserves its exact trip link.

**Verification:**
- [x] `nvm use 24 && npx vitest run tests/components/NearbySubwayServicePanel.test.tsx`

**Dependencies:** Completed map-first Phase 5.

**Files likely touched:**
- `components/nearby/NearbySubwayServicePanel.tsx`
- `tests/components/NearbySubwayServicePanel.test.tsx`

**Estimated scope:** Small

## Checkpoint: Directional service panel

- [x] Focused component test passes.
- [x] Keyboard names, focus, and exact links are verified.

## Task 18: Integrate exact train selection with the map

**Description:** Place the directional panel in the Nearby result surface and
turn a hero press into an exact selected-train expanded map state while retaining
the existing detail route.

**Acceptance criteria:**
- [x] Selected station and realtime service are adjacent in All/Subway modes.
- [x] Hero selection expands and can collapse the map without losing times.
- [x] Exact train, boarding station, route, user location, and subtle same-route
  trains use existing geometry and Trip identity.

**Verification:**
- [x] `nvm use 24 && npx vitest run tests/components/NearbySubwayServicePanel.test.tsx tests/components/NearbyDepartureRow.test.tsx`
- [x] `nvm use 24 && npx tsc --noEmit`

**Dependencies:** Task 17.

**Files likely touched:**
- `components/nearby/NearbyClient.tsx`
- `components/nearby/NearbyMap.tsx`
- `components/nearby/NearbyMapCanvas.tsx`
- `tests/components/NearbySubwayServicePanel.test.tsx`

**Estimated scope:** Medium

## Task 19: Verify and polish the primary subway interaction

**Description:** Extend the critical browser flow and perform one bounded
mobile/desktop visual, interaction, and accessibility pass against the supplied
reference hierarchy.

**Acceptance criteria:**
- [x] Direction switching, more times, exact hero selection, expanded map, and
  full detail link work in the browser.
- [x] Mobile has no horizontal page overflow and preserves vertical scrolling.
- [x] No material Impeccable finding remains in the implemented scope.

**Verification:**
- [x] `nvm use 24 && npx playwright test tests/e2e/nearby-bus.spec.ts`
- [x] `nvm use 24 && npm run lint`
- [x] `nvm use 24 && npx tsc --noEmit`
- [x] `nvm use 24 && npm run build`

**Dependencies:** Task 18.

**Files likely touched:**
- `tests/e2e/nearby-bus.spec.ts`
- `components/nearby/NearbySubwayServicePanel.tsx`
- `components/nearby/NearbyClient.tsx`

**Estimated scope:** Medium

## Checkpoint: Primary subway interaction complete

- [x] Focused component and browser tests pass.
- [x] Lint, typecheck, and production build pass.
- [x] Mobile and desktop captures pass the bounded finish review.

---

# Final Mobile-First Nearby Refinement

## Task 20: Compact the first viewport

**Description:** Reduce map and toolbar height on mobile while preserving useful
map context, search, status, filtering, and the existing desktop split.

**Acceptance criteria:**
- [x] At 375–430px, the first viewport includes the map/search and multiple
  useful nearby service options or a focused selected-service state.
- [x] Controls remain at least 44px and the fixed bottom navigation obscures no
  terminal content.

**Verification:**
- [x] Relevant Playwright layout assertions and browser captures pass.

**Dependencies:** Completed Task 19.

**Files likely touched:**
- `components/nearby/NearbyMap.tsx`
- `components/nearby/NearbyClient.tsx`
- `tests/e2e/nearby-bus.spec.ts`

**Estimated scope:** Medium

## Task 21: Refine service hierarchy and selection

**Description:** Make route, direction, destination, and ETA hierarchy explicit;
surface route-local direction controls and progressive disclosure; replace broad
selected fills with restrained route-led emphasis.

**Acceptance criteria:**
- [x] Every subway route card exposes its own accessible direction control and
  one dominant ETA with compact additional exact-trip departures.
- [x] Bus badges remain distinct from subway bullets and bus selection does not
  create a large application-blue rectangle.
- [x] No normal rider state exposes raw trip, stop, feed, enum, or debug copy.

**Verification:**
- [x] Focused component tests pass.
- [x] Dark and light selected states pass browser inspection.

**Dependencies:** Task 20.

**Files likely touched:**
- `components/nearby/NearbySubwayServicePanel.tsx`
- `components/nearby/NearbyDepartureRow.tsx`
- `tests/components/NearbySubwayServicePanel.test.tsx`

**Estimated scope:** Medium

## Task 22: Harden states and complete verification

**Description:** Align loading, permission, empty, and partial-failure states with
the refined surface, update stale E2E expectations, and run the required quality
gates plus one bounded Impeccable critique/correction round.

**Acceptance criteria:**
- [x] Loading, denied, empty, partial failure, selected train/bus, and light mode
  remain compact, actionable, and accessible.
- [x] No horizontal overflow, console errors, inaccessible controls, or
  regressions to exact Trip/Vehicle links remain.

**Verification:**
- [x] `npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build`, and
  `npx playwright test tests/e2e/nearby-bus.spec.ts` pass on Node 24.

**Dependencies:** Task 21.

**Files likely touched:**
- `components/nearby/NearbyClient.tsx`
- `tests/e2e/nearby-bus.spec.ts`

**Estimated scope:** Medium

## Checkpoint: Final Nearby refinement complete

- [x] All brief states and requested viewport classes have been inspected.
- [x] Automated quality gates pass and the final critique has no unresolved P0/P1 finding.

---

# Transit-Faithful Nearby Route Rows

## Task 23: Lock the corrected interaction contract

**Description:** Translate the Transit screenshots, official behavior, and user
correction into an authoritative spec and red-first tests.

**Acceptance criteria:**
- [x] The spec explicitly prohibits visible direction tabs and departure
  disclosure controls.
- [x] Tests describe row-level direction swipe and immediate selected ETA cards.

**Verification:**
- [x] Focused component tests fail against the previous tab/disclosure UI.

**Dependencies:** Completed Task 22.

**Files:** `SPEC-nearby-map-first-experience.md`,
`tests/components/NearbySubwayServicePanel.test.tsx`, `tasks/plan.md`,
`tasks/todo.md`

**Estimated scope:** Medium

## Task 24: Implement route swipe and ETA cards

**Description:** Remove the extra control bands while preserving exact route,
direction, departure, map, and detail behavior.

**Acceptance criteria:**
- [x] Each route is one compact row with no visible direction controls.
- [x] Swipe and ArrowLeft/ArrowRight change only that route's direction.
- [x] Selecting a route immediately shows exact ETA cards; selecting an ETA
  updates exact trip context without a disclosure step.

**Verification:**
- [x] Focused component tests pass.
- [x] Focused Playwright interaction passes.

**Dependencies:** Task 23.

**Files:** `components/nearby/NearbySubwayServicePanel.tsx`,
`tests/components/NearbySubwayServicePanel.test.tsx`,
`tests/e2e/nearby-bus.spec.ts`

**Estimated scope:** Medium

## Task 25: Reference comparison and regression gates

**Description:** Inspect bounded responsive captures against the Transit
hierarchy and complete the repository's required validation.

**Acceptance criteria:**
- [x] Collapsed, opposite-direction, and selected captures match the specified
  hierarchy and contain no tab/disclosure bands.
- [x] Dark/light and target widths retain no overflow or bottom-nav collision.

**Verification:**
- [x] Relevant Playwright suite, lint, typecheck, production build, and diff
  checks pass.

**Dependencies:** Task 24.

**Files:** `tests/e2e/nearby-bus.spec.ts`, `.impeccable/review/`

**Estimated scope:** Small

## Checkpoint: Transit-faithful route interaction complete

- [x] No visible direction tabs or departure disclosure controls remain.
- [x] Exact trip selection, map continuity, and Train details remain correct.
- [x] Automated checks and bounded screenshot review pass.

---

# Map-Centered Nearby Exploration

## Task 26: Define and test location search

**Description:** Add a typed, validated, bounded endpoint that combines static
MTA station matches with NYC place/address matches from the existing geocoder.

**Acceptance criteria:**
- [x] Query and limit are validated; the upstream URL is fixed server-side.
- [x] Results use stable `station`/`place` variants with validated coordinates.
- [x] Bad or unavailable geocoder data falls back to station matches.

**Verification:**
- [x] Focused unit/API tests fail before implementation and pass afterward.

**Dependencies:** Task 25.

**Files:** `types/location.ts`, `lib/transit/location-search.ts`,
`app/api/locations/route.ts`, `docs/api.md`,
`tests/unit/location-search.test.ts`

**Estimated scope:** Medium

## Task 27: Make the map center the Nearby origin

**Description:** Separate real device position from the search origin, enable
Leaflet panning, add a fixed center pin, and refresh discovery at drag end.

**Acceptance criteria:**
- [x] User drag-end updates the origin once; programmatic movement does not.
- [x] The blue marker remains the actual device and Locate restores it.
- [x] Origin changes clear stale selections and drive station/bus discovery.

**Verification:**
- [x] Focused Playwright drag flow passes with changed `near` coordinates.

**Dependencies:** Task 26.

**Files:** `components/nearby/NearbyClient.tsx`,
`components/nearby/NearbyMap.tsx`, `components/nearby/NearbyMapCanvas.tsx`,
`tests/e2e/nearby-bus.spec.ts`

**Estimated scope:** Medium

## Task 28: Add the location/station search overlay

**Description:** Replace the Plan a trip link with an accessible combined
search field and connect selection to the map-centered origin flow.

**Acceptance criteria:**
- [x] Search renders station/place states and selects exact coordinates.
- [x] Suggestions open above the field and remain clear at mobile sizes.
- [x] Manual exploration works without fabricating a user location marker.

**Verification:**
- [x] Component tests and mocked Playwright search flow pass.
- [x] Responsive captures, lint, typecheck, full tests, and build pass.

**Dependencies:** Tasks 26–27.

**Files:** `components/nearby/NearbyLocationSearch.tsx`,
`components/nearby/NearbyMap.tsx`,
`tests/components/NearbyLocationSearch.test.tsx`,
`tests/e2e/nearby-bus.spec.ts`

**Estimated scope:** Medium

## Checkpoint: Map-centered exploration complete

- [x] Map drag, search selection, and locate restoration share one origin model.
- [x] Actual device location remains semantically and visually distinct.
- [x] Existing Transit-faithful route interactions remain unchanged.
- [x] Automated and visual quality gates pass.
