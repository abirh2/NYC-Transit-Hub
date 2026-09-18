# Spec: Nearby Bus Stop Realtime

Module ID: `nearby-bus-realtime`

## Objective

For nearby directional bus stops, return chronologically useful SIRI
predictions as normalized departures linked to their exact trips and vehicles.
Preserve rider-facing progress, actual vehicle position, freshness, and partial
failure state without issuing an unbounded request fan-out from the browser.

## Tech Stack

- MTA Bus Time SIRI StopMonitoring and VehicleMonitoring
- Zod response validation in `lib/mta/`
- Shared normalized realtime domain in `types/transit.ts`
- Next.js fetch revalidation using `lib/transit/cache-policy.ts`

## Commands

- Adapter tests: `nvm use 24 && npx vitest run tests/unit/transit-adapters.test.ts`
- Service tests: `nvm use 24 && npx vitest run tests/unit/nearby-bus-realtime.test.ts`
- Typecheck: `nvm use 24 && npx tsc --noEmit`
- Lint: `nvm use 24 && npm run lint`
- Build: `nvm use 24 && npm run build`

## Project Structure

- `lib/mta/buses.ts` — validated SIRI clients and stop-level retrieval
- `lib/transit/bus-adapter.ts` — SIRI-to-domain translation
- `lib/transit/realtime-service.ts` — snapshot merging and orchestration
- `app/api/buses/realtime/route.ts` — single-stop compatibility endpoint
- `app/api/buses/nearby/route.ts` — bounded multi-stop nearby response
- `types/transit.ts`, `types/api.ts` — typed contracts
- `tests/fixtures/` — sanitized SIRI fixtures

## Contract and Code Style

The endpoint returns one independent result per requested directional stop so a
single failure does not erase successful neighbors.

```ts
interface NearbyBusRealtimeResult {
  stopId: string;
  sourceState: RealtimeSourceState;
  departures: Departure[];
  trips: BusTrip[];
  vehicles: TransitVehicle[];
  error: string | null;
}
```

- A `Departure.tripId` must resolve to a returned `BusTrip.id`.
- `BusTrip.vehicleId`, when present, must resolve to a returned vehicle whose
  `tripId` matches that trip.
- Deduplicate by stable departure/trip/vehicle IDs, never rendered copy.
- Keep source-specific names in boundary schemas and map to camelCase domain
  fields afterward.

## Functional Requirements

1. Use StopMonitoring for arrivals at a directional boarding stop.
2. Preserve destination/headsign, predicted arrival/departure, progress text,
   distance from call, stops from call, trip ID, vehicle ID, and recorded time.
3. Add normalized stops-away data without deriving it from straight-line
   distance.
4. Preserve actual SIRI vehicle coordinates with `position.source = "actual"`.
5. Sort predictions chronologically across multiple routes at the same stop.
6. Return only future/current predictions; a passed prediction cannot remain at
   “1 min” indefinitely.
7. Bound the number of stop lookups and predictions per stop.
8. Centralize multi-stop fetching server-side with bounded concurrency and the
   existing short realtime cache window.
9. Represent unavailable, malformed, stale, empty, and successful stops
   independently.
10. Keep static stop metadata on its longer cache lifecycle.

## Testing Strategy

- Parse sanitized SIRI fixtures with optional/missing fields and unknown
  extensions.
- Verify multiple routes at one stop sort by predicted time.
- Verify stops-away uses SIRI progression fields only.
- Verify departure → trip → vehicle identity through merged snapshots.
- Verify stable deduplication and selection across reordered refresh payloads.
- Verify one failed stop returns partial results for successful stops.
- Verify passed or disappeared predictions leave the active departure set.
- Unit tests never call live Bus Time.

## Boundaries

- Always: validate SIRI responses; preserve stable source identity; apply
  timeouts and bounded concurrency; return source health explicitly.
- Ask first: changing global realtime cache duration or introducing a new
  upstream Bus Time endpoint.
- Never: infer stops-away from geographic distance; convert bus GPS to subway
  interpolation; expose the API key; let one failed stop fail the whole mode.

## Success Criteria

- Each departure resolves to its exact trip and, when reported, exact vehicle.
- Stops-away and approach copy match the sanitized SIRI fixture.
- A dense request has a fixed upper bound on upstream work.
- Partial upstream failure still returns successful stop results.
- Realtime and static metadata demonstrably use different cache policies.

## Open Questions

- None blocking. The plan will choose the smallest bounded-concurrency policy
  that meets the dense-fixture performance test.
