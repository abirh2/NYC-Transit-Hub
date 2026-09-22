---
target: final mobile-first visual/UX refinement of /nearby
total_score: 35
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/Users/ahossain/Documents/GitHub/NYC-Transit-Hub/components/nearby/NearbyClient.tsx"
target_fingerprint: "sha256:83c469a653a655e0063b1ef00eef0bfba0d0b732b54d726e287f0486058271d4"
target_path: /Users/ahossain/Documents/GitHub/NYC-Transit-Hub/components/nearby/NearbyClient.tsx
timestamp: 2026-09-21T16-12-37Z
slug: components-nearby-nearbyclient-tsx
---
Method: dual-agent (A: /root/impeccable_design_review · B: /root/impeccable_detector_review)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | Compact live/partial/offline status is clear; aggregate feed status could be more explicit. |
| 2 | Match System / Real World | 4 | MTA route identity, rider directions, destinations, station/stop names, and ETA language are concrete. |
| 3 | User Control and Freedom | 3 | Train selection collapses cleanly and denied location has a trip-planning escape; manual location entry remains outside scope. |
| 4 | Consistency and Standards | 4 | Train and bus selection now share restrained route-led emphasis and explicit detail actions. |
| 5 | Error Prevention | 4 | Route-local direction controls are visibly anchored to the owning route and exact trips remain canonical. |
| 6 | Recognition Rather Than Recall | 4 | Route bullets, labels, visible tabs, stop names, and explicit detail links minimize inference. |
| 7 | Flexibility and Efficiency | 3 | Swipe, pointer, and keyboard paths are present; the mode filter still adds one pre-arrival decision row. |
| 8 | Aesthetic and Minimalist Design | 4 | The compact map-first surface now prioritizes map, route, destination, and ETA without card chrome. |
| 9 | Error Recovery | 3 | Loading, partial failure, and location denial are actionable; a full manual nearby-location fallback is not included. |
| 10 | Help and Documentation | 3 | In-context copy is concise and actionable without exposing internal identifiers. |
| **Total** |  | **35/40** | **Strong, release-ready refinement** |

## Design Specificity Verdict

The result feels authored for a time-pressed NYC rider rather than interchangeable dashboard UI. Route bullets, rider-facing borough directions, exact train/bus identity, dominant tabular ETAs, and synchronized map/list selection form one coherent transit-specific grammar.

The deterministic Impeccable scan returned zero findings. Independent visual review found four runtime/semantic issues the detector could not recognize: failed external tiles, ambiguous route ownership, denied-location recovery, and undersized map hit targets. All four were corrected and reverified in dark/light responsive captures.

No reliable user-visible detector overlay was available because the exposed browser surface did not permit script injection. Screenshot fixtures, live accessibility output, source inspection, CLI detector output, and Playwright coverage were used instead.

## Overall Impression

The strongest quality is decision speed: riders see location context, route identity, destination, and the next ETA quickly, while exact-trip details and later departures remain one deliberate action away. The final corrections restore trust in the map and make direction scope unmistakable.

## What's Working

- The next departure has a decisive hierarchy: route bullet, destination, and large ETA dominate; station/walk/freshness stay secondary.
- Selected train continuity is unusually strong: route geometry, exact train marker, upcoming times, collapse control, and an explicit detail handoff remain synchronized.
- Responsive and state coverage is broad: five target widths, dark/light, loading, denied location, partial failure, route direction, expanded departures, selected train, and selected bus are captured and tested.

## Priority Issues

1. **[P2] Aggregate status could be more source-explicit.** In mixed mode, one compact chip cannot fully explain differing subway and bus freshness. A later hardening pass could expose mode-specific freshness only when sources diverge.
2. **[P2] The mode filter still precedes the first ETA.** It remains because the brief explicitly requires All/Subway/Bus and 44px targets; if future usage shows low interaction, it could move below the first service without changing data flow.

## Persona Red Flags

- **Casey, distracted mobile rider:** The final route-owned tab treatment removes the largest wrong-platform risk. The remaining extra decision is the mode filter before arrivals.
- **Sam, keyboard/low-vision rider:** Tabs support arrow/Home/End keys, motion respects reduced-motion, map locations have 44px hit areas and focus treatment, and heading order is fixed. Map state remains visually richer than its textual equivalent.
- **Jordan, first-time rider:** Explicit Train details/Bus details and route-anchored directions remove ambiguous icon and scope interpretation. Browser-settings recovery is clearer, with Plan a trip as an escape.

## Minor Observations

- The Esri attribution strip is visible and legally clear, though visually brighter than the dark map.
- Light-theme streets intentionally recede; route and location marks remain the dominant color.
- Routes reporting only one direction correctly avoid presenting a meaningless tab control.

## Questions to Consider

- If All remains the overwhelmingly used default, could mode filtering move after the first service in a future evidence-led iteration?
- When subway and bus freshness differ, should the compact header show two micro-status labels or only explain divergence inline?
