# Implementation Plan: Final Modernization

## Overview

Complete analytics/exploration, establish truthful PWA and realtime behavior, perform an evidence-driven app-wide quality pass, and finish portfolio documentation. Work proceeds in thin slices, preserves the normalized transit domain, and extends the rider design system without another rewrite.

## Architecture Decisions

- The capability map and four module specs are the scope source of truth.
- Shared analytics components live in `components/analytics`; only repeated patterns are promoted.
- Existing API shapes remain authoritative. Reliability and crowding copy becomes precise rather than inventing metrics.
- Cache policy is split by data semantics: realtime prioritizes freshness; static/GTFS-derived artifacts prioritize efficient reuse.
- Shared visibility-aware polling/freshness is introduced incrementally.
- Impeccable verification is bounded to one evidence batch, one correction batch, and one confirmation batch.

## Dependency Graph and Build Order

```text
analytics primitives → Reliability → Crowding → Service Changes
cache classification → service worker → freshness UI → polling migrations
analytics + PWA foundations
  → app-wide audit fixes
  → portfolio docs + cleanup/test gaps
  → full gates + representative flows
```

## Task List

### Phase 1: Analytics foundation

- [x] Task 1: Add shared analytics surface, tooltip, freshness, and empty-chart primitives with tests.
- [x] Task 2: Recompose Reliability around metric truth, route comparison, trend, time-of-day, and contextual links.
- [x] Task 3: Modernize Crowding around estimated relative conditions, line context, methodology, and limitations.
- [x] Task 4: Modernize Service Changes as active/planned/recent exploration with contextual actions.

### Checkpoint: Analytics

- [x] Focused tests, lint, and typecheck pass.
- [x] Analytics pages work at mobile/desktop widths in both themes.

### Phase 2: PWA and realtime integrity

- [x] Task 5: Formalize and test static, slow-changing, and realtime cache/freshness classifications.
- [x] Task 6: Apply semantic Serwist caching and complete install metadata verification.
- [x] Task 7: Add shared online/visibility-aware polling and freshness presentation.
- [x] Task 8: Migrate primary realtime consumers and implement honest offline states in consumer-sized slices.

### Checkpoint: Realtime integrity

- [x] Focused tests and production build pass; offline behavior is covered by deterministic tests because browser network emulation was unavailable.
- [x] Hidden tabs do not retain duplicate full-rate polling.

### Phase 3: App-wide quality

- [x] Task 9: Run Impeccable detector plus one batched desktop/mobile audit and record verified findings.
- [x] Task 10: Fix shared accessibility, safe-area, theme, and global-state defects.
- [x] Task 11: Fix route-specific responsive and partial-failure defects in route-sized slices.
- [x] Task 12: Fix verified map/chart/client performance problems without identity regressions.

### Checkpoint: Product quality

- [x] One confirmation pass clears priority findings at required widths/themes.
- [x] Relevant tests, lint, typecheck, build, and E2E pass.

### Phase 4: Portfolio and release evidence

- [x] Task 13: Rewrite README and architecture/accuracy documentation against source truth.
- [x] Task 14: Establish a lightweight screenshot/demo capture structure.
- [x] Task 15: Remove verified debris and close critical behavior-test gaps.
- [x] Task 16: Run full gates and representative rider/visualization flows; record limitations.

### Checkpoint: Complete

- [x] All module success criteria are satisfied or documented as external limitations.
- [x] Final report covers all fourteen requested deliverable categories.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Incident-derived reliability is overstated | High | Put the metric definition next to the headline and test the copy |
| Service-worker fallback exposes old ETAs | High | Separate realtime caches, cap age, and make UI freshness/offline state authoritative |
| Polling refactor duplicates timers or misses resume | High | Pure hook contract with fake-timer and visibility cleanup tests |
| Analytics abstraction becomes too generic | Medium | Promote only repeated presentation; keep shaping local |
| Live MTA/database variability blocks verification | Medium | Deterministic fixtures plus documented live-only limitations |
| Broad polish creates unrelated churn | Medium | Fix only recorded high-confidence findings in small batches |
| Charts/maps regress mobile or themes | High | Verify all required widths and both themes in the same bounded pass |

## Open Questions

None blocking. The user authorized proceeding without approval pauses; discoveries that alter product truth update the relevant spec before implementation.
