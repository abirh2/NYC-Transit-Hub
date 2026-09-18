---
target: /nearby
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/ahossain/Documents/GitHub/NYC-Transit-Hub/components/nearby"
timestamp: 2026-09-18T16-22-37Z
slug: components-nearby
---
# Impeccable Critique: `/nearby`

Method: dual-agent (A: `/root/nearby_design_review` · B: `/root/nearby_detector`)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Loading and recovery are strong; refresh/freshness is uneven. |
| 2 | Match system / real world | 2 | The flow exposes ranking and implementation metadata before rider decisions. |
| 3 | User control and freedom | 2 | A departure tap navigates instead of first selecting map/list context. |
| 4 | Consistency and standards | 3 | Shared tokens are coherent; subway and bus ETA hierarchy diverge. |
| 5 | Error prevention | 3 | Defaults and recovery are sensible. |
| 6 | Recognition rather than recall | 2 | Station selection and departures are spatially separated. |
| 7 | Flexibility and efficiency | 1 | Mode → location → direction delays the core answer. |
| 8 | Aesthetic and minimalist design | 1 | Introductory chrome, cards, borders, and metadata compete with arrivals. |
| 9 | Error recovery | 3 | Denied, partial, and total failures recover clearly. |
| 10 | Help and documentation | 1 | Intro copy exists, but map/list and selection behavior are absent. |
| **Total** |  | **21/40** | **Acceptable foundation; significant UX improvement required.** |

## Design Specificity Verdict

The route identity and realtime data are transit-specific, but the composition is a generic dashboard: page header, status card, filter pills, ranked location cards, then a secondary detail panel. The rider's spatial position and imminent service are not one continuous surface.

The deterministic detector returned zero findings across `components/nearby`. This is not a contradiction: the failure is information architecture and interaction priority, not a mechanical styling violation.

## What Works

- Geolocation, loading, denied, partial-failure, and retry states are robust.
- Route bullets/badges and the subway hero ETA provide strong transit identity.
- Focus styles, accessible names, pressed states, and touch-target sizing are a sound foundation.

## Priority Issues

1. **P1 — useful service arrives too late.** Remove repeated page/location/filter headings and open with a contextual map followed immediately by arrivals.
2. **P1 — boarding-place cards dominate service.** Replace numbered and nested cards with flat service rows where route and ETA dominate and stop identity supports.
3. **P1 — selection and detail are conflated.** First tap should select and synchronize the map; an explicit action should preserve the existing exact deep link.
4. **P2 — mobile ergonomics are dashboard-shaped.** Use a 35–45dvh map, reachable floating destination control, natural vertical scrolling, and secondary filters.
5. **P2 — state semantics are uneven.** Equalize subway/bus freshness and use skeletons that preserve the map/results composition.

## Persona Red Flags

- **Casey (mobile):** first ETA sits below excess chrome; bus ETA is too small to scan while moving; horizontal direction UI competes with scrolling.
- **Sam (accessibility):** incomplete tab semantics and unannounced scroll-driven direction state; raw direction/trip IDs add noise.
- **Jordan (first-time):** unexplained numbered rankings and multiple choices appear before a map or actionable arrival.

## Direction

Build a continuous map-to-service composition: contextual map around 40dvh; compact locate/freshness and “Where to?” overlays; flat interleaved service rows; dominant tabular ETA; first-tap selection synchronized to the map; explicit deep-link action; sticky map plus results panel on desktop. Preserve data fetching, IDs, refresh cadence, normalized grouping, and failure isolation.

Questions skipped: the user explicitly requested uninterrupted spec-driven execution and supplied a complete hierarchy/interaction brief.
