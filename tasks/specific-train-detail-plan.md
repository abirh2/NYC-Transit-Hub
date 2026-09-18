# Plan: Specific Train Detail Experience

## Dependency graph

```text
URL context + pure rider metrics
        │
        ├── focused detail view model and lifecycle states
        │       ├── hero/progress/departures
        │       └── focused map framing
        └── following and same-direction service queries
                │
                └── Nearby/back/full-tracker integration and browser coverage
```

## Vertical slices

1. Preserve boarding context when selecting a trip and add pure context/stops-
   away derivation. Verify with unit tests.
2. Render the subway rider-detail hero, boarding ETA, progress, stale/following
   states, and accessible departure switching. Verify component tests.
3. Add focused map framing and explicit full-route action while keeping the
   existing realtime map/geometry engine. Verify map/component tests.
4. Add same-direction/platform departures and relevant service-status surface.
   Verify deterministic fixtures and selection tests.
5. Add expired/passed lifecycle recovery and Nearby/back/full-tracker E2E flow.
   Verify Playwright plus full validation.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| `setTrip` currently clears station context | Change the selection contract so trip selection accepts/preserves boarding context. |
| Realtime stop sequence is incomplete or ambiguous | Return nullable stops-away and conservative copy. |
| Selected trip disappears during polling | Keep URL selection and render lifecycle recovery using route/station departures. |
| Map fit effects reset user panning | Key focused framing on selection identity/context, not every poll. |
| Existing generic panel is shared by bus/rail | Scope rider-specific additions to subway trip detail and retain existing modes. |

## Verification checkpoints

- Checkpoint 1: URL round-trip and pure context tests pass.
- Checkpoint 2: exact selected trip and boarding context appear in component view.
- Checkpoint 3: refresh changes data in place without changing selection identity.
- Checkpoint 4: expired/passed states and recovery actions are covered.
- Final: lint, typecheck, tests, build, and targeted Playwright flow pass.
