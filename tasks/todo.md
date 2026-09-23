# Final Modernization Tasks

## Task 1: Shared analytics primitives

**Status:** Complete

**Acceptance:** Repeated chart surface, tooltip, freshness, and empty-state treatments are token-backed, accessible, feature-agnostic, and consumed by at least two analytics features.

**Verify:** Focused component tests, lint, typecheck.

**Dependencies:** None

**Files:** `components/analytics/*`, `components/ui/index.ts`, `tests/components/AnalyticsPrimitives.test.tsx`

## Task 2: Reliability exploration

**Status:** Complete

**Acceptance:** The page follows headline → route comparison → trend → time-of-day/detail; defines its incident-derived metric; supports keyboard route selection and contextual Realtime links; charts work in both themes and on mobile.

**Verify:** Reliability tests, lint, typecheck, manual widths/themes.

**Dependencies:** Task 1

**Files:** Up to four reliability components plus focused tests per slice.

## Task 3: Crowding exploration

**Status:** Complete

**Acceptance:** Estimated relative conditions, selected-line context, concise methodology, limitations, and unavailable states are explicit without implying occupancy.

**Verify:** Crowding unit/component tests and responsive check.

**Dependencies:** Task 1

**Files:** `app/crowding/page.tsx`, up to three crowding components, focused tests.

## Task 4: Service Changes exploration

**Status:** Complete

**Acceptance:** Active/planned/recent buckets obey alert timing; items show routes, type/severity, description, time, state; stable identifiers create useful links and missing IDs do not.

**Verify:** Incident tests and responsive check.

**Dependencies:** Task 1

**Files:** `app/incidents/IncidentsClient.tsx`, up to three incident components, focused tests.

## Checkpoint: Tasks 1–4

- [ ] Focused tests, lint, and typecheck pass.
- [ ] Required widths/themes pass for all analytics routes.

## Task 5: Cache and freshness classification

**Status:** Complete

**Acceptance:** Every cached endpoint has a documented semantic class; realtime maximum age cannot masquerade as current; static geometry/metadata remains efficient.

**Verify:** New cache-policy unit tests.

**Dependencies:** None

**Files:** `lib/transit/cache-policy.ts`, `tests/unit/cache-policy.test.ts`, `docs/architecture.md`

## Task 6: Serwist and install metadata

**Status:** Complete

**Acceptance:** Realtime, slow-changing API, GTFS/static data, and assets use distinct cache rules; generated SW output is untouched; install metadata is valid and consistent.

**Verify:** Typecheck, production build, installed metadata inspection.

**Dependencies:** Task 5

**Files:** `app/sw.ts`, `public/manifest.json`, `app/layout.tsx`

## Task 7: Shared polling and freshness

**Status:** Complete

**Acceptance:** Hidden documents pause/reduce polling and resume once; fresh/stale/offline/unavailable use shared copy and thresholds; all listeners/timers clean up.

**Verify:** Hook fake-timer tests and freshness component tests.

**Dependencies:** Task 5

**Files:** `lib/hooks/useVisiblePolling.ts`, `lib/hooks/index.ts`, `components/ui/DataFreshness.tsx`, tests.

## Task 8: Realtime consumer/offline migration

**Status:** Complete

**Acceptance:** Primary surfaces share freshness semantics; offline says “Realtime unavailable offline”; no duplicate polls or lost trip/vehicle identity.

**Verify:** Focused tests, build, offline/visibility browser check.

**Dependencies:** Tasks 6–7

**Files:** Execute as consumer-sized slices of at most five files.

## Checkpoint: Tasks 5–8

- [ ] Production build and focused tests pass.
- [ ] Cache/offline/hidden-tab behavior is verified in browser.

## Task 9: Impeccable evidence pass

**Status:** Complete

**Acceptance:** Verified findings include severity, impact, location, and narrow fix across accessibility, performance, responsive, theming, and integrity; false positives are excluded.

**Verify:** Saved audit report and evidence.

**Dependencies:** Tasks 1–8

**Files:** `docs/ai/final-quality-audit.md`

## Task 10: Shared quality corrections

**Status:** Complete

**Acceptance:** Verified system-level landmark, focus, touch target, safe-area, reduced-motion, theme, and shared state defects are fixed without navigation redesign.

**Verify:** Component tests, detector, keyboard/theme pass.

**Dependencies:** Task 9

**Files:** Split shared corrections into at most five files per slice.

## Task 11: Route-specific responsive/failure fixes

**Status:** Complete

**Acceptance:** Required widths have no blocking overflow/clipping/nav overlap; independent failures remain isolated; maps, sheets, and charts are mobile-usable.

**Verify:** Relevant component and Playwright specs.

**Dependencies:** Task 10

**Files:** Split by route into at most five files per slice.

## Task 12: Verified client performance

**Status:** Complete

**Acceptance:** Static data is not recomputed/refetched on realtime ticks; identity-stable markers avoid remounts; map/chart libraries stay out of unrelated page bundles.

**Verify:** Network/render evidence, tests, production build.

**Dependencies:** Tasks 9–11

**Files:** Split by verified finding.

## Checkpoint: Tasks 9–12

- [x] Priority findings clear one confirmation pass.
- [x] Lint, typecheck, tests, build, and relevant E2E pass.

## Task 13: README and architecture accuracy

**Status:** Complete

**Acceptance:** Required portfolio topics are concise and source-verified; architecture shows the full pipeline and domain distinctions; subway estimates versus bus reported positions are unmistakable.

**Verify:** Links, commands, versions, and claims checked against source.

**Dependencies:** Tasks 1–12

**Files:** `README.md`, `docs/architecture.md`, `app/about/page.tsx`

## Task 14: Demo capture structure

**Status:** Complete

**Acceptance:** Required showcase states have a repeatable capture checklist; no unnecessary binaries or secrets/raw IDs are added.

**Verify:** Documentation/link review.

**Dependencies:** Task 13

**Files:** `docs/demo-capture.md`, `README.md`

## Task 15: Debris and test gaps

**Status:** Complete

**Acceptance:** Debris is traced before removal; critical normalization, geometry, selection, stale/offline, saved-station, and deep-link behaviors have meaningful outcome tests.

**Verify:** Focused tests, then full unit/integration suite.

**Dependencies:** Tasks 1–14

**Files:** Split cleanup/test work into at most five files per slice.

## Task 16: Final quality gate and flows

**Status:** Complete

**Acceptance:** All configured gates and required rider/visualization flows pass or exact external blockers are recorded; final delivery covers every requested category.

**Verify:** Commands from all four specs plus final browser walkthrough.

**Dependencies:** Tasks 1–15

**Files:** `tasks/todo.md` and evidence documentation only.

## Checkpoint: Complete

- [x] All four module specs are satisfied or limitations are explicit.
- [x] Final delivery is ready for review.
