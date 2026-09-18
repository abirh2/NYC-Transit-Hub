# Transit domain conventions

Read this document when changing MTA clients, feed parsing, stations, arrivals, alerts, accessibility, routing, reliability, or crowding.

## Data sources and boundaries

- Subway, bus, LIRR, and Metro-North real-time data come from separate upstream feeds. Do not assume identifiers, schedules, or fields are interchangeable across modes.
- Subway and commuter-rail GTFS-Realtime payloads are protobuf decoded through the existing `protobufjs` pipelines in `lib/mta/gtfs-rt.ts` and `lib/mta/rail.ts`.
- Static GTFS-derived data under `data/gtfs/` supplies station, stop, line, shape, and schedule metadata. Update it through the relevant script rather than hand-editing large generated datasets.
- `lib/mta/` owns upstream clients and transformations. `lib/gtfs/` owns static-data parsing and lookup. Route handlers under `app/api/` should stay thin.
- Feed responses are untrusted and may be missing, stale, partially populated, or extended with MTA-specific fields. Validate inputs, tolerate unknown fields where appropriate, and degrade gracefully.

## Normalized realtime domain

`types/transit.ts` is the shared source-independent domain. Source-specific
translation lives in `lib/transit/*-adapter.ts`; shared filtering and orchestration
live in `lib/transit/departures.ts` and `lib/transit/realtime-service.ts`.

- `Departure` is one prediction at one stop. Its `tripId` always points to the
  individual `TransitTrip` returned by the same snapshot/service.
- `TransitTrip` retains route, normalized direction, destination, start data,
  ordered stop-time updates, progress, vehicle identity, and update time.
- `TransitVehicle.position` distinguishes actual coordinates from inferred
  stop-to-stop progress. Do not present inferred subway progress as GPS.
- `TransitStation` is a rider-facing complex. Its `sourceIds` retain every GTFS
  parent ID, while `stops` retain the directional platform IDs that realtime
  feeds use.
- Machine directions (`northbound`, `southbound`, and so on) never contain
  station-specific copy. Pass contextual rider labels separately.

Trip selection and visualization use the normalized objects directly:

- `lib/transit/trips.ts` owns client-safe trip lookup and active-trip filters.
  An active subway trip must be assigned, non-canceled, reporting ordered stop
  updates, and have positionable progress; preserve its source `trip.id` as the
  UI, React-key, and deep-link identity.
- `lib/transit/subway-trip-position.ts` separates progress context from map
  projection. At-stop positions use the station coordinate; approaching,
  departed, and between-stop positions are conservative estimates along the
  known adjacent station segment. Unknown and not-started progress is not
  projected.
- `lib/gtfs/subway-route-geometry.ts` optionally replaces that station segment
  with official MTA GTFS shape geometry. Exact static-trip aliases are preferred,
  followed by ordered stop-pattern matching; unresolved trips retain the
  station fallback. This changes only map projection, never trip identity,
  progress semantics, or the individual realtime `TransitTrip` model.
- Subway map and line-diagram copy must call these positions estimated. The
  current station-to-station projector does not imply GPS precision and may be
  replaced by GTFS shape/topology geometry without changing trip selection.
- `lib/transit/realtime-client-payload.ts` validates the API payload and
  hydrates serialized dates before normalized data enters client state.

Legacy `TrainArrival` and `BusArrival` remain compatibility projections for
existing components. New features should use departures, trips, and vehicles
directly. See [ADR-001](../decisions/001-normalized-transit-domain.md).

## Identifiers and station complexes

A display name is not a stable station identifier. Several distinct GTFS complexes can share a name; Times Sq-42 St is the key example.

- Station search merges same-name complexes and exposes every base ID through `allIds` and directional platform IDs through `allPlatforms`.
- Fetch arrivals for every platform relevant to the selected complex, not only the first north/south pair.
- Deduplicate combined arrivals by `tripId`. Do not deduplicate only by display text or React key.
- Preserve direction suffix handling (`N`/`S`) and base-station ID normalization used by `lib/gtfs/`.
- Search all consumers when changing station selection payloads; board, nearby-station, commute, route-planning, and dashboard flows can use the same station data differently.

Reference implementations: `lib/gtfs/parser.ts`, `app/api/stations/route.ts`, and `components/board/StationBoard.tsx`.

## Alerts and incidents

For a time `now`:

```text
active   = (start is absent or start <= now) and (end is absent or end > now)
upcoming = start > now
resolved = end is present and end <= now
```

Checking only the end time incorrectly classifies future planned work as active.

- Preserve upstream snake_case and extension fields in the raw validation schema, including `transit_realtime.mercury_alert`; map them to camelCase application types after validation.
- MTA alert copy can contain bracketed routes such as `[E]`, `[4]`, `[SI]`, and `[SIR]`. Use `SubwayBullet` rendering consistently in headers, descriptions, cards, and detail views. `SI` and `SIR` refer to the Staten Island Railway presentation.
- When changing alert filtering or presentation, check `lib/mta/alerts.ts`, incident API routes, incident components, reliability ingestion, and dashboard cards.

## Elevators and accessible routing

- Elevator equipment identifiers and station IDs are different concepts; do not substitute one for the other.
- The outage feed identifies equipment with `equipment`; the equipment-reference feed uses `equipmentno`. Keep separate boundary schemas rather than treating either name as universal.
- Current outages and upcoming planned outages have distinct semantics and endpoints.
- Accessible routes must account for the current equipment state, not only static ADA metadata.
- If an outage feed is unavailable, surface staleness or reduced confidence rather than silently treating every facility as operational.

## Real-time behavior

- Use the existing 30-60 second caching and polling conventions unless a measured need justifies changing them.
- Show or preserve last-updated/stale-state information where the UI already exposes it.
- Avoid synchronized duplicate requests: reuse route-level caching and existing client refresh loops.
- Keep feed failures isolated so one mode or card can degrade without taking down the full dashboard.
- Shared refresh values live in `lib/transit/cache-policy.ts`: static metadata
  is cached longer than realtime feeds, and alerts have their own policy.
- Realtime snapshots report `sourceState` (`ok`, `stale`, `empty`,
  `unavailable`, or `malformed`) so consumers do not infer upstream health from
  an empty array.
- Nearby bus discovery is stop-first: static GTFS determines boardable
  locations, while SIRI StopMonitoring supplies predictions for retained stop
  IDs. Never use geographic vehicle proximity as a substitute.
- SIRI v2 localized text fields may be arrays of `{ value, lang }` records.
  Normalize them at the validated boundary before constructing domain objects.
- In StopMonitoring, `MonitoredCall` is the requested boarding stop. The first
  `OnwardCall` is normally the vehicle's actual next stop and can precede the
  boarding stop. Model those roles separately.
- Stops-away and rider-facing progress come from SIRI `StopsFromCall`,
  `NumberOfStopsAway`, and `PresentableDistance`; do not derive them from GPS.
- Nearby multi-stop work is capped at twelve unique stop IDs, four concurrent
  upstream requests, and six future visits per stop. Preserve one source state
  per stop so partial failure remains visible and usable.

## External response changes

Before changing Zod schemas or transformations, inspect a current response or a sanitized sample in `scripts/`. Test optional/missing fields and MTA extension fields. Never silently coerce an unknown upstream shape into plausible but incorrect transit data.
