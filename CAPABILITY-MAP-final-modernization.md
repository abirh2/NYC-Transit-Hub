# Capability Map: Final Modernization

| Module id | Responsibility | Depends on |
|---|---|---|
| `analytics-exploration` | Shared analytics language and Reliability, Crowding, and Service Changes journeys | — |
| `pwa-realtime-integrity` | Install metadata, semantic caching, offline truthfulness, freshness, and efficient realtime polling | — |
| `app-quality` | App-wide accessibility, responsive, theme, failure-state, map, and client-performance corrections | `analytics-exploration`, `pwa-realtime-integrity` |
| `portfolio-engineering` | README, architecture/accuracy docs, showcase structure, debris cleanup, tests, and release evidence | `analytics-exploration`, `pwa-realtime-integrity`, `app-quality` |

Build order: `analytics-exploration`, `pwa-realtime-integrity` → `app-quality` → `portfolio-engineering`

## Initiative assumptions

1. Existing MTA feeds, normalized transit types, public routes, and persistence remain authoritative.
2. Reliability remains incident-derived; the repository has no broader on-time-performance feed.
3. Crowding remains a relative service-condition estimate, never measured occupancy or passenger counts.
4. Subway positions remain inferred from trip progress and GTFS geometry; bus coordinates may be reported GPS positions when supplied by Bus Time.
5. Recharts, Leaflet, HeroUI, Tailwind, Serwist, and the current dependency set remain in place.
6. The prior rider modernization is the visual baseline. This phase extends it without another architecture or brand rewrite.
7. The user's instruction to proceed without approval authorizes progression through specification gates. Discoveries that change product truth update the relevant spec before implementation.

