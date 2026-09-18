# Spec: Nearby Bus Stop Discovery

Module ID: `nearby-bus-stops`

## Objective

Return a small, useful set of boardable MTA bus-stop locations near a rider.
Discovery begins with static GTFS stops, never nearby vehicles. Results retain
the directional stop IDs and route associations needed for Bus Time
StopMonitoring while reducing dense clusters of visually repetitive cards.

## Tech Stack

- Next.js 16 App Router route handlers
- Strict TypeScript and Zod at external/request boundaries
- Preprocessed MTA GTFS data in `data/gtfs/`
- Existing distance and walking-time utilities in `lib/utils/distance.ts`

## Commands

- Focused tests: `nvm use 24 && npx vitest run tests/unit/nearby-bus-stops.test.ts`
- Typecheck: `nvm use 24 && npx tsc --noEmit`
- Lint: `nvm use 24 && npm run lint`
- Build: `nvm use 24 && npm run build`

## Project Structure

- `lib/gtfs/bus-stops.ts` — static lookup, route association, grouping, ranking
- `app/api/buses/stops/route.ts` — validated HTTP boundary
- `types/transit.ts` — normalized stop and stop-group contracts
- `types/api.ts` — serialized endpoint contract
- `tests/unit/nearby-bus-stops.test.ts` — deterministic density fixtures

## Contract and Code Style

The public result is a rider-facing group containing one or more directional
stops. Directional stops remain intact even when their display location is
grouped.

```ts
interface NearbyBusStopGroup {
  id: string;
  name: string;
  mode: "bus";
  location: Coordinates;
  distanceMiles: number;
  routeIds: string[];
  stops: NearbyBusStop[];
}
```

- Use stable stop IDs, not names, as source identity.
- Use deterministic group IDs derived from retained stop IDs.
- Keep pure grouping/ranking helpers separate from the route handler.
- Follow the existing file formatting and `@/` imports.

## Functional Requirements

1. Accept validated latitude, longitude, radius, and result-limit inputs.
2. Search static GTFS stops on the server and sort primarily by distance.
3. Include routes serving each directional stop and the union for its group.
4. Group only stops representing the same practical boarding location when
   name and geographic proximity support that conclusion.
5. Opposite-direction stops may share a display group, but their IDs,
   coordinates, route sets, and direction metadata must remain separate.
6. Do not merge same-name stops that are materially separated geographically.
7. Limit rider-facing groups after grouping so dense Manhattan results do not
   consume the page.
8. Continue using the same miles and approximate walking-time convention as
   Nearby subway.

## Testing Strategy

- Unit-test distance ordering and radius/limit handling.
- Use small fixtures for duplicate records, same-intersection stops,
  opposite-direction stops, same-name distant stops, and dense Manhattan data.
- Assert every original directional stop ID remains available after grouping.
- Route-handler tests cover malformed coordinates and clamped limits.
- No test depends on a live MTA response.

## Boundaries

- Always: retain prediction-capable stop IDs; validate request coordinates;
  use static GTFS route associations; make ordering deterministic.
- Ask first: changing generated GTFS formats or adding a spatial dependency.
- Never: discover nearby buses from vehicle coordinates; merge away an
  opposite-direction boarding location; send the entire stop dataset to the
  browser.

## Success Criteria

- A dense Manhattan fixture produces a bounded list of useful location groups.
- Distance order is stable, with no more than the requested group limit.
- Related stops reduce duplicate cards while all directional stop IDs survive.
- Route badges can be rendered without an additional route lookup.
- Existing subway nearby lookup remains unchanged.

## Open Questions

- None blocking. Grouping thresholds and default limits will be selected from
  fixture evidence during planning and recorded as named constants.
