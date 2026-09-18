# Spec: Specific Nearby Bus Detail

Module ID: `nearby-bus-detail`

## Objective

Let a rider select one predicted bus from Nearby and follow that exact trip and
vehicle in Live Tracker. The detail experience prioritizes the selected bus and
boarding stop, uses actual SIRI coordinates, updates without losing identity,
and transitions honestly when the bus reaches, passes, or disappears from the
selected stop.

## Tech Stack

- Existing `/realtime` URL-state and detail-panel architecture
- Existing Leaflet map and static GTFS bus shapes
- Normalized `Departure`, `BusTrip`, and `TransitVehicle` contracts
- React 19 and HeroUI 2

## Commands

- Detail tests: `nvm use 24 && npx vitest run tests/unit/bus-trip-detail.test.ts tests/components/TransitDetailPanel.test.tsx`
- Relevant E2E: `nvm use 24 && npx playwright test tests/e2e/nearby-bus.spec.ts`
- Typecheck: `nvm use 24 && npx tsc --noEmit`
- Lint: `nvm use 24 && npm run lint`
- Build: `nvm use 24 && npm run build`

## Project Structure

- `lib/transit/deep-link.ts` — stable bus selection URL contract
- `lib/transit/bus-trip-detail.ts` — framework-free lifecycle/detail model
- `app/realtime/RealtimeClient.tsx` — hydrated normalized bus state
- `components/realtime/TransitDetailPanel.tsx` — shared detail presentation
- `components/realtime/map/RealtimeMap.tsx` — selected bus/stop framing
- `tests/unit/`, `tests/components/`, `tests/e2e/` — layered verification

## Contract and Code Style

Nearby links identify both the predicted trip and vehicle when available:

```ts
createRealtimeSearchParams({
  mode: "bus",
  routeId: departure.routeId,
  stopId: departure.stopId,
  tripId: departure.tripId,
  vehicleId: trip.vehicleId ?? undefined,
});
```

If the existing URL model can represent this unambiguously with `trip`, extend
it additively rather than creating a second bus-only navigation scheme.

## Functional Requirements

1. Selecting a Nearby arrival opens that exact departure/trip, not the first
   vehicle later found on the same route.
2. Hydrate normalized bus departures, trips, and vehicles in Live Tracker;
   legacy `BusArrival` may remain for unaffected compatibility consumers.
3. The selected vehicle marker uses actual SIRI coordinates and is visually
   dominant without suggesting subway-style interpolation.
4. Initial map bounds prioritize selected bus plus selected boarding stop.
5. Detail shows route, destination, boarding stop, next stop, ETA, stops away
   or approach state, freshness, and following buses where available.
6. “View full route” clears focused framing while retaining the bus route.
7. Refresh resolves selection by stable trip/vehicle identity, not array index.
8. When the bus reaches the stop, report arrival/at-stop state.
9. When it passes or disappears, stop showing its prior ETA, explain that it is
   no longer approaching, and offer subsequent departures.
10. Browser back returns to the previous Nearby state.

## Testing Strategy

- Unit-test exact selection, reordered refreshes, at-stop, passed-stop, stale,
  disappeared, and following-bus states.
- Component-test keyboard-selectable following arrivals and accessible copy.
- Map tests prove selected bus coordinates come directly from the normalized
  actual vehicle position.
- Browser-test direct navigation, refresh, map focus, full-route transition,
  and back navigation on desktop and mobile.

## Boundaries

- Always: key selected state by stable source ID; distinguish actual bus GPS
  from estimated subway position; keep the map supplementary.
- Ask first: changing the existing generic URL parameter names in a breaking
  way or replacing the shared detail shell.
- Never: guess a vehicle from route and ETA; keep a passed bus at a frozen ETA;
  pass buses through subway position projection.

## Success Criteria

- A Nearby arrival deep link restores the same bus after refresh.
- The map initially contains and emphasizes the boarding stop and actual bus.
- Detail and following arrivals preserve trip/vehicle identity.
- Passed or missing buses transition to an honest lifecycle state.
- Subway train detail behavior remains unchanged.

## Open Questions

- None blocking. The implementation plan will resolve whether vehicle identity
  is an additive URL field or derived from the selected normalized trip.
