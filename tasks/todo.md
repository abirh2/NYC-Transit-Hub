# Rider Utility Modernization Tasks

## Task 1: Shared location search and query state

**Description:** Add pure query-state parsing/serialization and a reusable,
keyboard-accessible location search field backed by `/api/locations`.

**Acceptance criteria:**
- [x] Known location/station context hydrates from and serializes to URL state.
- [x] Search exposes loading, no-results, error, and keyboard-selection states.
- [x] Consumers no longer need a direct browser call to an external geocoder.

**Verification:**
- [x] Focused unit and component tests pass.

**Dependencies:** None

**Files likely touched:**
- `lib/transit/rider-query-state.ts`
- `components/ui/LocationSearchField.tsx`
- `components/ui/index.ts`
- `tests/unit/rider-query-state.test.ts`
- `tests/components/LocationSearchField.test.tsx`

**Estimated scope:** Medium

## Task 2: Shared station-complex search

**Description:** Modernize the existing subway station search as the single
board-oriented station picker with saved stations, route bullets, ambiguity
context, and deterministic keyboard/data states.

**Acceptance criteria:**
- [x] Results retain stable complex IDs and platform metadata.
- [x] Saved stations appear through the existing preference hook.
- [x] Keyboard, loading, empty, and unavailable behavior is tested.

**Verification:**
- [x] Focused StationSearch component tests pass.

**Dependencies:** Task 1

**Files likely touched:**
- `components/board/StationSearch.tsx`
- `tests/components/StationSearch.test.tsx`
- `components/ui/SubwayBullet.tsx`

**Estimated scope:** Medium

## Checkpoint: Tasks 1–2

- [x] Focused tests pass.
- [x] New shared contracts are strict-TypeScript clean.

## Task 3: URL-driven Station Board shell

**Description:** Make subway Station Board selection reload-safe and replace its
old generic-card/header stack with a compact station identity and save action.

**Acceptance criteria:**
- [x] `?station=` selects a complex and changes when a rider selects another.
- [x] Station name and route identity precede secondary controls.
- [x] Unknown station and unavailable metadata states use rider-facing copy.

**Verification:**
- [x] Station Board component tests pass.

**Dependencies:** Task 2

**Files likely touched:**
- `app/board/page.tsx`
- `components/board/StationBoard.tsx`
- `tests/components/StationBoard.test.tsx`

**Estimated scope:** Medium

## Task 4: Shared departure rows and station accessibility

**Description:** Adapt board arrivals into shared exact-trip departure rows,
retain directional grouping, and add compact current accessibility context.

**Acceptance criteria:**
- [x] All platform IDs are fetched and duplicate trips are removed by `tripId`.
- [x] Every subway departure links to the exact existing train-detail flow.
- [x] Accessibility failure never blocks departure content.

**Verification:**
- [x] Board/departure component tests pass.

**Dependencies:** Task 3

**Files likely touched:**
- `components/board/StationBoard.tsx`
- `components/board/ArrivalsList.tsx`
- `components/accessibility/StationAccessibilityStatus.tsx`
- `tests/components/StationBoard.test.tsx`
- `tests/components/ArrivalsList.test.tsx`

**Estimated scope:** Medium

## Task 5: Canonical Plan form and context handoff

**Description:** Rebuild the Plan form with shared location search, origin →
destination → Plan hierarchy, accessible preference, swap, and URL state.

**Acceptance criteria:**
- [x] Home/Nearby/Board context pre-fills supported fields.
- [x] Query state survives reload and back/forward navigation.
- [x] Submit continues to use `/api/routes/trip` and handles unavailable input.

**Verification:**
- [x] Plan form component tests pass.

**Dependencies:** Task 1

**Files likely touched:**
- `components/accessibility/RouteFinder.tsx`
- `app/routes/RoutesClient.tsx`
- `tests/components/RouteFinder.test.tsx`
- `components/dashboard/HomeSections.tsx`

**Estimated scope:** Medium

## Task 6: Rider-first itinerary results

**Description:** Simplify itinerary summaries and expandable legs around known
duration, route identity, transfers, destination, timing, walking, and warnings.

**Acceptance criteria:**
- [x] Raw routing fields never appear as visible copy.
- [x] Missing values are omitted rather than invented.
- [x] No-route and upstream-unavailable states are distinct and concise.

**Verification:**
- [x] Planner result component tests pass.

**Dependencies:** Task 5

**Files likely touched:**
- `components/accessibility/RouteFinder.tsx`
- `components/accessibility/RouteResults.tsx`
- `tests/components/RouteFinder.test.tsx`
- `tests/components/RouteResults.test.tsx`

**Estimated scope:** Medium

## Checkpoint: Tasks 3–6

- [x] Station Board exact-trip journey passes.
- [x] Plan query-state journey passes.
- [x] Lint and typecheck pass.

## Task 7: Accessibility data state and filtering

**Description:** Extract outage parsing/filtering/sorting into pure helpers and
distill the page around current affected stations and upcoming work.

**Acceptance criteria:**
- [x] Feed-unavailable and zero-outage states remain semantically distinct.
- [x] Station, line, equipment, ADA, and current/upcoming filters compose.
- [x] Rows lead with station, route, area, state, and updated/return time.

**Verification:**
- [x] Accessibility unit tests and typecheck pass.

**Dependencies:** Tasks 1–2

**Files likely touched:**
- `lib/transit/accessibility-status.ts`
- `app/accessibility/AccessibilityClient.tsx`
- `components/accessibility/OutageList.tsx`
- `tests/unit/accessibility-status.test.ts`
- `tests/components/AccessibilityClient.test.tsx`

**Estimated scope:** Medium

## Task 8: Accessibility deep links and Plan consolidation

**Description:** Remove the embedded duplicate planner, hydrate station/saved
filter context from URL, and add stable Plan/Board handoffs.

**Acceptance criteria:**
- [x] Accessibility contains no second Route Finder implementation.
- [x] `?station=` filtering works when matching is reliable.
- [x] Plan action carries the accessibility preference.

**Verification:**
- [x] Accessibility helper tests and typecheck pass.

**Dependencies:** Tasks 5 and 7

**Files likely touched:**
- `app/accessibility/AccessibilityClient.tsx`
- `components/accessibility/OutageFilters.tsx`
- `components/accessibility/OutageList.tsx`
- `tests/components/AccessibilityClient.test.tsx`

**Estimated scope:** Medium

## Task 9: Commute setup and status integration

**Description:** Use shared location search in commute setup, simplify configured
commute status, and link known endpoints into Plan while preserving auth/API state.

**Acceptance criteria:**
- [x] Create/edit/delete/default commute behavior is unchanged.
- [x] Setup no longer owns a duplicate client geocoder.
- [x] Summary exposes origin, route, destination, next action/status, and a
  context-preserving Plan link.

**Verification:**
- [x] Commute component and API contract tests pass.

**Dependencies:** Tasks 1, 5, and 6

**Files likely touched:**
- `components/commute/CommuteSetup.tsx`
- `components/commute/CommuteSummary.tsx`
- `app/commute/CommuteClient.tsx`
- `tests/components/CommuteSetup.test.tsx`
- `tests/components/CommuteSummary.test.tsx`

**Estimated scope:** Medium

## Task 10: Rider-first Service Changes

**Description:** Reorder `/incidents` around active/upcoming rider impact and
apply shared route/status/state presentation while preserving history filters.

**Acceptance criteria:**
- [x] Active service changes appear before statistics/history controls.
- [x] Active, upcoming, resolved, empty, and unavailable labels are explicit.
- [x] Bracketed train references use shared route rendering.

**Verification:**
- [x] Incident unit/component tests pass.

**Dependencies:** Task 1

**Files likely touched:**
- `app/incidents/page.tsx`
- `app/incidents/IncidentsClient.tsx`
- `components/incidents/IncidentList.tsx`
- `tests/components/IncidentsClient.test.tsx`

**Estimated scope:** Medium

## Checkpoint: Tasks 7–10

- [x] Accessibility, Commute, and Service Changes state matrices pass.
- [x] Existing persistence and API contract coverage remains green.

## Task 11: Cross-page rider journeys

**Description:** Add deterministic Playwright coverage for required cross-page
flows and the specified mobile/tablet/desktop widths.

**Acceptance criteria:**
- [x] Home → Nearby → Station → exact train → Realtime is covered across focused rider journeys.
- [x] Home/Nearby → Plan, Saved station → Board, and Station → Accessibility
  are covered.
- [x] 375, 393, 430, 768, and 1280 layouts have no blocking overflow.

**Verification:**
- [x] Relevant Playwright specs pass.

**Dependencies:** Tasks 3–10

**Files likely touched:**
- `tests/e2e/rider-utilities.spec.ts`
- `playwright.config.ts`

**Estimated scope:** Small

## Task 12: Impeccable finish and repository validation

**Description:** Run detector and one batched desktop/mobile inspection, apply
one correction batch, confirm once, and execute every repository gate.

**Acceptance criteria:**
- [x] Old nested-card, border, radius, spacing, badge, and status-chip remnants
  are addressed in changed rider surfaces.
- [x] Keyboard/focus, screen-reader labels, contrast, reduced motion, and touch
  targets meet the project quality bar.
- [x] Lint, typecheck, full tests, build, and relevant E2E pass.

**Verification:**
- [x] `nvm use 24 && npm run lint`
- [x] `nvm use 24 && npx tsc --noEmit`
- [x] `nvm use 24 && npm run test`
- [x] `nvm use 24 && npm run build`
- [x] `nvm use 24 && npm run test:e2e -- tests/e2e/rider-utilities.spec.ts`

**Dependencies:** Task 11

**Files likely touched:**
- `.impeccable/review/*`
- Changed UI files from detector/inspection findings only

**Estimated scope:** Medium

## Checkpoint: Complete

- [x] Every initiative spec criterion is satisfied.
- [x] Final report covers pages, consolidation, shared components, Plan,
  saved/commute, accessibility, URL state, performance, Impeccable, and tests.
