# Spec: Specific Train Detail Experience

## Objective

When a rider taps a departure in Nearby, the next screen must represent that
exact realtime subway trip rather than only its route. The rider must be able
to answer where the train is, how far it is from the selected boarding station,
when it will arrive there, where it is going, and what follows it.

The feature extends the existing `/realtime` architecture. It does not create
a second realtime engine or a second trip identity model.

### Architecture decision

Use `/realtime?mode=subway&route=<route>&station=<station>&direction=<direction>&trip=<trip>`
as the canonical, bookmarkable detail URL. The existing URL-backed selection
hook remains the source of truth. A selected trip keeps `station`/`stop` in the
URL so boarding context survives switching trips, refresh, and browser back.
The full tracker is the same route with the detail selection cleared or an
explicit “View full route” action that preserves route, direction, station, and
trip context as appropriate.

If a trip disappears from a refreshed snapshot, render a normal lifecycle state
with the original route/station context and useful current departures; do not
render a generic 404.

## Tech Stack

- Next.js 16 App Router, React 19, strict TypeScript
- HeroUI 2 and Tailwind CSS 4
- Existing normalized transit types and realtime service
- Vitest + React Testing Library; Playwright for user-flow verification

## Commands

```bash
nvm use 24 && npm run lint
nvm use 24 && npx tsc --noEmit
nvm use 24 && npm run test
nvm use 24 && npm run build
nvm use 24 && npm run test:e2e
```

## Project Structure

- `lib/transit/` — URL state and pure rider-context/progress derivation
- `components/realtime/` — reusable focused detail, progress, departure, and
  map presentation
- `app/realtime/` — route orchestration and polling
- `components/nearby/` — entry point; preserve station/direction/trip links
- `tests/unit/` and `tests/components/` — deterministic domain/UI coverage
- `tests/e2e/` — Nearby → specific train → tracker/back flow
- `docs/` — architecture/specification decisions

## Code Style

Keep domain derivation framework-free and make uncertainty explicit:

```ts
const context = getSubwayTripRiderContext({ trip, boardingStopId });

return context.stopsAway === null
  ? ""
  : `${context.stopsAway} stops away`;
```

Use existing normalized `TransitTrip`, `Departure`, `TransitStop`, and alert
types. Do not infer stops away from geographic distance, and do not label an
estimated position as GPS.

## Functional Requirements

1. Nearby navigation carries the exact trip ID, route, direction, and boarding
   station/stop into the detail URL.
2. The detail hero shows route, destination, direction, boarding-station ETA,
   and a progress phrase derived from realtime state. “Approaching” is used
   only for an `approaching` progress state.
3. The focused map visually prioritizes the selected trip and boarding station;
   the existing full-route map remains available through an explicit action.
4. The progress sequence distinguishes completed, current/previous, next,
   boarding, subsequent, and terminal stops without claiming unsupported arrival.
5. Stops away is derived from the trip’s ordered stop sequence and is omitted
   when the sequence/current state is ambiguous.
6. Same-route following departures and compact same-direction/platform service
   remain individually selectable by `tripId`.
7. Relevant route/station alerts and realtime freshness are shown without
   dumping unrelated system alerts.
8. Polling updates the same selected trip’s ETA, progress, map position, and
   stops-away without remounting the page or resetting the map/sheet.
9. After passing the boarding stop, the UI communicates departed/passed state,
   avoids negative ETA, and offers current departures without silently replacing
   the selected trip.
10. Missing/expired trip links show a useful lifecycle state with route context,
    current departures, Nearby, and full-route actions.
11. Mobile is primary; desktop uses a focused map plus information panel.
12. The map is supplementary; semantic progress and accessible controls convey
    the same information without color or map dependence.

## Testing Strategy

- Pure unit tests for URL context, boarding-stop retention, stops-away,
  progress/lifecycle states, and departure grouping.
- Component tests for hero, progress, focused detail, following-train
  selection, stale/expired states, and full-tracker actions.
- Deterministic realtime fixtures; no live MTA dependency in tests.
- Playwright flow for Nearby → station → direction → exact trip, reload, refresh,
  expired URL, full tracker transition, and browser back on mobile and desktop
  viewports.

## Boundaries

- Always: reuse normalized realtime snapshots; preserve opaque trip IDs; keep
  uncertainty explicit; use semantic accessible status/progress; run targeted
  tests, lint, typecheck, and build for the cross-cutting change.
- Ask first: database/schema changes, new dependencies, new realtime endpoints,
  or changes to generated GTFS/PWA artifacts.
- Never: create a duplicate realtime engine, estimate stops away from distance,
  fabricate “approaching,” show expired trips as live, or expose secrets.

## Success Criteria

- Tapping `[D] 6 min → Coney Island–Stillwell Av` from Nearby loads the same
  `tripId` in the URL and detail UI.
- Boarding station remains visible and its ETA remains the selected train’s ETA.
- Progress, focused map, stops-away, following trains, freshness, alerts, and
  lifecycle transitions are covered by deterministic tests.
- Reload preserves the URL selection; refresh preserves the selected trip and
  map/sheet state; an expired trip gets a useful recovery state.
- Full tracker transition preserves route/direction context and browser back
  returns to Nearby state where the browser history provides it.

## Open Questions

- User location remains opt-in and is shown only when already available.
- Exact alert matching follows the existing normalized alert/status logic; if
  the current feed lacks stop-specific matching, route-level matching is the
  conservative fallback.
