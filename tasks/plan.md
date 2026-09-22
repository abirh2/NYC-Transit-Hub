# Implementation Plan: Rider-first Home dashboard

## Overview

Build a mobile-first Home surface around a single client data owner. Reuse the
existing geolocation hook, nearby APIs, normalized transit contracts, saved
station persistence, commute summary, and alert feed. Share a compact variant
of the existing nearby departure row so route identity, ETA hierarchy, and
exact-trip deep links remain consistent.

## Architecture Decisions

- `app/page.tsx` remains a thin Server Component.
- `HomeDashboard` owns Home requests and timed refreshes. Children receive data
  and callbacks and never poll.
- Pure dashboard logic lives in `lib/transit/dashboard-home.ts`, keeping alert
  ranking and service-status derivation deterministic and testable.
- `NearbyDepartureRow` gains a compact direct-link variant used by Home while
  retaining its existing select-in-place behavior on `/nearby`.
- Home requests nearby subway and bus data through the existing route handlers;
  repeated station realtime URLs in one refresh are promise-deduplicated.
- The first two saved stations are loaded by stable station ID, expanded to all
  represented source IDs, and deduplicated by `tripId`.
- Route relevance is the union of visible nearby routes, saved-station routes,
  and commute route tokens. Stop relevance uses loaded station/platform IDs.
- Existing reliability, incidents, and crowding previews stay below the rider
  area; the developer-oriented feed-health card is removed from Home.

## Dependency Graph and Build Order

`normalized domain + nearby helpers` → `dashboard pure logic` → `shared compact
departure row` → `Home data owner` → `Home sections` → `page and browser tests`

## Task List

### Phase 1: Contracts and shared behavior

- [x] Task 1: Add red-first tests and pure Home prioritization/status helpers.
- [x] Task 2: Add and test the compact exact-trip variant of the shared Nearby
  departure row.

### Checkpoint: Shared contracts

- [x] Focused unit/component tests pass.
- [x] Exact `tripId` remains present in every compact departure link.

### Phase 2: Rider dashboard

- [x] Task 3: Implement the single-owner Home data orchestration and resilient
  location/favorites/commute/alerts refresh behavior.
- [x] Task 4: Implement the mobile-first rider sections and desktop two-column
  hierarchy, then wire the thin page.

### Checkpoint: Core experience

- [x] Location, favorites, commute, alerts, and realtime failure states render
  without large empty-card stacks.
- [x] No presentational Home child performs its own fetch or polling.

### Phase 3: Verification and finish

- [x] Task 5: Add Home component and Playwright coverage for required states.
- [x] Task 6: Run Impeccable detector/review, inspect desktop and mobile once,
  fix the batched findings, and run repository validation.

### Checkpoint: Complete

- [x] Focused tests, lint, typecheck, full tests, build, and Home E2E pass.
- [x] The first viewport answers “what can I catch?” before showcasing features.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Home duplicates Nearby data logic | High | Reuse existing APIs, helpers, hook, and shared row; keep only orchestration in Home. |
| Station complexes lose platforms | High | Expand every `sourceId` and deduplicate by `tripId`. |
| Too many client requests | Medium | Limit previews, batch bus stop IDs, deduplicate URLs per refresh, and use one poll owner. |
| Alert relevance is ambiguous | Medium | Rank exact route/stop intersections first, then severity and recency. |
| Empty states dominate mobile | Medium | Use compact inline actions and promote configured favorites/commute when location is absent. |
| Live visual QA depends on upstream data | Medium | Mock state matrices in tests and inspect the honest live fallback separately. |

## Verification Checkpoints

1. Pure logic and shared-row focused tests after Phase 1.
2. Home component state matrix after Phase 2.
3. One desktop/mobile browser inspection batch, one correction batch, then full
   repository validation after Phase 3.

## Open Questions

None. The implementation follows `SPEC-home-rider-dashboard.md`.
