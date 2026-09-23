# Implementation Plan: Rider Utility Modernization

## Overview

Modernize the remaining rider utilities as a connected system. Establish shared
search/query-state and status foundations first, then deliver focused vertical
slices for Station Board, Plan, Accessibility, Commute, and Service Changes.
Preserve every existing public route and data capability while removing embedded
planner/geocoder duplication and old oversized-card hierarchy.

## Architecture Decisions

- `/routes` remains the Plan route; page metadata and visible copy call it Plan.
- `/api/locations` is the only client-facing address/place/station geocoder.
- `/api/stations` remains the station-complex search source for board-specific
  selection because it retains `allIds`, `allPlatforms`, routes, and stops.
- Query state is owned by small pure helpers and initialized through App Router
  client boundaries; no new global state library is introduced.
- Subway board departures adapt to the normalized shared departure presentation
  while preserving all-platform fetching and exact `tripId` identity.
- Accessibility owns outage polling. Contextual status receives data through a
  parent or bounded cached request and does not introduce synchronized polling.
- Local saved stations and authenticated commutes keep existing persistence.
- `/incidents` keeps its URL and history but becomes rider-facing Service Changes.

## Dependency Graph and Build Order

```text
location/station search contracts + query helpers
  ├── Station Board → accessibility station context → saved station journey
  ├── Plan form → Plan result hierarchy → Home/Nearby/Board handoff
  │                  ├── Accessibility planner handoff
  │                  └── Commute endpoint handoff
  └── shared rider states/status → Accessibility + Service Changes

Commute modernization depends on shared location search and Plan handoff.
Cross-page E2E and visual QA depend on every vertical slice.
```

## Task List

### Phase 1: Shared contracts

- [x] Task 1: Add tested rider utility query-state helpers and shared location
  search field backed by `/api/locations`.
- [x] Task 2: Modernize the station-complex search control with saved results,
  route identity, keyboard behavior, and deterministic states.

### Checkpoint: Shared foundations

- [x] Focused unit/component tests pass.
- [x] No client-side external geocoder remains in the new shared path.

### Phase 2: Primary rider journeys

- [x] Task 3: Make Station Board selection URL-driven and modernize its focused
  station identity/save hierarchy.
- [x] Task 4: Present subway board departures through shared exact-trip rows and
  add compact station accessibility context.
- [x] Task 5: Rebuild Plan's origin/destination form around shared search and
  reload-safe context handoff.
- [x] Task 6: Distill Plan itinerary results around duration, route identity,
  transfers, destination, departure/wait, walking, and honest errors.

### Checkpoint: Core journeys

- [x] Station Board → exact train → Realtime works with stable trip identity.
- [x] Home/Nearby/Board context can prefill Plan and survive reload.
- [x] Focused tests, lint, and typecheck pass.

### Phase 3: Supporting rider utilities

- [x] Task 7: Refactor Accessibility filtering/state into tested pure helpers and
  a rider-first current/upcoming outage presentation.
- [x] Task 8: Remove the embedded Accessibility planner and add station/saved
  filtering plus contextual Plan and Board links.
- [x] Task 9: Modernize Commute setup/status using shared location search and
  Plan handoff while preserving authenticated persistence.
- [x] Task 10: Modernize Service Changes hierarchy and shared status/route
  presentation without altering Reliability or Crowding.

### Checkpoint: Utility integration

- [x] Accessibility, Commute, and Service Changes state matrices pass.
- [x] Existing API contracts and persistence tests remain green.

### Phase 4: Cross-page verification and finish

- [x] Task 11: Add cross-page Playwright coverage for the four required rider
  journeys and responsive widths.
- [x] Task 12: Run the bounded Impeccable desktop/mobile audit, apply one batched
  correction pass, then run lint, typecheck, full tests, build, and E2E.

### Checkpoint: Complete

- [x] Every specification success criterion is satisfied.
- [x] No analytics-heavy page was redesigned.
- [x] Final report covers all ten requested completion categories.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Existing planner mixes form, geocoding, and results | High | Extract contract-first in two slices; preserve `/api/routes/trip` |
| Station Board still uses legacy `TrainArrival` | High | Adapt at presentation boundary; retain multi-platform fetch and `tripId` |
| Outages lack stable station IDs | Medium | Match conservatively by normalized name; never infer healthy from missing data |
| Shared search becomes over-generic | Medium | Keep location and station-complex search as two explicit contracts |
| Commute auth/API regressions | High | Preserve endpoints/ownership and cover changed consumers with tests |
| Live MTA/OTP variability causes flaky tests | High | Use deterministic fixtures and mock network boundaries |
| Scope expands into analytics pages | Medium | Limit changes to compile-safe shared primitive compatibility |
| Mobile fixes harm desktop density | Medium | Verify 375, 393, 430, 768, and 1280 widths together |

## Verification Checkpoints

1. Shared contracts: focused unit/component tests.
2. Board + Plan: focused tests, lint, typecheck, and critical manual journey.
3. Supporting utilities: state-matrix tests and unchanged API contract tests.
4. Finish: Impeccable detector, one desktop/mobile inspection batch, one fix
   batch, full lint/typecheck/test/build, and relevant Playwright specs.

## Open Questions

None. The capability map records the source-based assumptions authorized by the
user's instruction to continue without approval pauses.
