# Rider-first Home dashboard tasks

## Task 1: Home transit prioritization contracts

**Description:** Add pure helpers for hydrating/deduplicating departures,
collecting relevant route/stop IDs, prioritizing active alerts, and deriving a
small route-status overview.

**Acceptance criteria:**
- [x] Route/stop matches outrank unrelated severe alerts.
- [x] Active alert timing and severity order are preserved.
- [x] Route status uses readable good/delay/planned/suspended labels.

**Verification:**
- [x] `nvm use 24 && npm test -- tests/unit/dashboard-home.test.ts`

**Dependencies:** None

**Files likely touched:**
- `lib/transit/dashboard-home.ts`
- `tests/unit/dashboard-home.test.ts`

**Estimated scope:** Small

## Task 2: Shared compact departure row

**Description:** Extend the existing Nearby row with a compact direct-link
presentation suitable for Home without duplicating ETA, route, direction, or
deep-link logic.

**Acceptance criteria:**
- [x] Compact rows retain mode, destination, rider direction, and strong ETA.
- [x] The full row is keyboard-accessible and links to the exact trip.
- [x] Existing Nearby select-in-place behavior remains unchanged.

**Verification:**
- [x] `nvm use 24 && npm test -- tests/components/NearbyDepartureRow.test.tsx`

**Dependencies:** Task 1

**Files likely touched:**
- `components/nearby/NearbyDepartureRow.tsx`
- `tests/components/NearbyDepartureRow.test.tsx`

**Estimated scope:** Small

## Checkpoint: Tasks 1–2

- [x] Focused tests pass.
- [x] TypeScript reports no contract regressions in touched files.

## Task 3: Single-owner Home data orchestration

**Description:** Implement location, nearby subway/bus, saved stations,
commute, and alerts loading behind one Home request owner with bounded refresh
and failure isolation.

**Acceptance criteria:**
- [x] Location uses the existing hook and never adds another store/prompt loop.
- [x] All station source IDs are fetched and departures deduplicated by trip.
- [x] Children receive data only; no duplicate child polling exists.

**Verification:**
- [x] `nvm use 24 && npm test -- tests/components/HomeDashboard.test.tsx`

**Dependencies:** Tasks 1–2

**Files likely touched:**
- `components/dashboard/HomeDashboard.tsx`
- `components/dashboard/home-types.ts`
- `tests/components/HomeDashboard.test.tsx`

**Estimated scope:** Medium

## Task 4: Rider-first Home presentation

**Description:** Build the compact nearby, personalized transit, route status,
relevant alerts, and lower intelligence layout; replace the current card grid.

**Acceptance criteria:**
- [x] Mobile hierarchy begins with realtime transit and a route-planning action.
- [x] Desktop uses a primary rider column and compact secondary status column.
- [x] Empty/error states are contextual and headings/focus are accessible.

**Verification:**
- [x] `nvm use 24 && npm test -- tests/components/HomeDashboard.test.tsx`

**Dependencies:** Task 3

**Files likely touched:**
- `components/dashboard/HomeSections.tsx`
- `components/dashboard/HomeDashboard.tsx`
- `components/dashboard/index.ts`
- `app/page.tsx`

**Estimated scope:** Medium

## Checkpoint: Tasks 3–4

- [x] Required Home state matrix passes component tests.
- [x] Browser DOM exposes one H1 and ordered H2/H3 section headings.

## Task 5: Home end-to-end coverage

**Description:** Replace feature-directory assertions with the rider-first Home
contract and verify responsive navigation remains intact.

**Acceptance criteria:**
- [x] E2E asserts nearby/planning, service, saved/commute fallback, and analytics order.
- [x] Mobile and desktop smoke paths remain navigable.

**Verification:**
- [x] `nvm use 24 && npx playwright test tests/e2e/home.spec.ts`

**Dependencies:** Task 4

**Files likely touched:**
- `tests/e2e/home.spec.ts`

**Estimated scope:** Small

## Task 6: Visual and repository validation

**Description:** Run the bounded Impeccable finish pass, inspect desktop/mobile,
apply one batched correction, then run all required repository gates.

**Acceptance criteria:**
- [x] Detector has no unresolved mechanical findings in changed UI targets.
- [x] Desktop/mobile captures satisfy the rider-first hierarchy.
- [x] Lint, typecheck, full tests, build, and Home E2E pass.

**Verification:**
- [x] `nvm use 24 && npm run lint`
- [x] `nvm use 24 && npx tsc --noEmit`
- [x] `nvm use 24 && npm run test`
- [x] `nvm use 24 && npm run build`
- [x] `nvm use 24 && npx playwright test tests/e2e/home.spec.ts`

**Dependencies:** Task 5

**Files likely touched:**
- `.impeccable/review/desktop.png`
- `.impeccable/review/mobile.png`

**Estimated scope:** Small

## Checkpoint: Complete

- [x] Every spec success criterion is satisfied.
- [x] No unrelated user changes were modified.
