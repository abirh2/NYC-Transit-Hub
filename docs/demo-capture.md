# Demo Capture Guide

This repository avoids committing large screenshots. Use this checklist to produce a consistent portfolio set from a production build.

## Setup

1. Run `nvm use 24 && npm run build && npm run start`.
2. Use a non-sensitive fixture or public feed state; do not expose account details, coordinates tied to a person, tokens, or raw internal IDs.
3. Capture light and dark themes at 393 × 852 for mobile and 1440 × 1000 for desktop.
4. Keep browser zoom at 100% and wait for the visible freshness state to settle.

## Required states

| File stem | Route/state | Evidence to include |
|---|---|---|
| `home` | `/` | Nearby or saved departures plus service context |
| `nearby-direction` | `/nearby` | A selected origin, direction-aware departures, and map/list relationship |
| `subway-trip` | `/realtime` | One individual subway trip selected; estimated-position wording visible |
| `realtime-route` | `/realtime` | Full route map or diagram with route and direction context |
| `bus-vehicle` | `/realtime?mode=bus` | One vehicle with reported-coordinate context when available |
| `reliability` | `/reliability` | Headline, route comparison, trend, and incident-derived definition |
| `service-changes` | `/incidents` | Active/upcoming/recent tabs and compact route-focused items |

## Interaction clips

- Nearby: change direction, select a specific train, open the full Realtime route, then return without losing context.
- Realtime: choose route and direction, select a vehicle, switch map/diagram, and open related station context.
- Rider flow: Home → Nearby → Plan → Station Board → Accessibility.

Record a short clip only when motion or state continuity is the point. Prefer compressed external portfolio assets over adding video binaries to this repository.
