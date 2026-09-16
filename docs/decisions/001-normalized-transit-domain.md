# ADR-001: Normalize realtime transit data around trips and departures

## Status

Accepted

## Date

2026-09-16

## Context

The original realtime clients projected subway trip updates directly into flat
arrival rows and projected SIRI vehicle activity directly into bus-arrival
rows. Those shapes work for boards, but they discard ordered trip context and
make tracker, Nearby, and visualization features reconstruct an individual
train or bus from loosely related fields.

Existing boards and trackers already consume the legacy `TrainArrival` and
`BusArrival` contracts, so a breaking replacement would create unnecessary UI
scope and regression risk.

## Decision

Translate source payloads at the integration boundary into a shared domain in
`types/transit.ts`:

- A `Departure` is a prediction at one stop and carries the stable source
  `tripId`.
- A `TransitTrip` is the full individual journey, with route, direction,
  destination, ordered stop-time updates, progress, and vehicle association.
- A `TransitVehicle` owns actual or inferred position data. Subway positions
  are explicitly marked inferred when no coordinates exist; bus SIRI
  coordinates are marked actual.
- A `TransitStation` is a rider-facing complex containing directional
  `TransitStop` platform records and every represented source station ID.
- Purpose-specific API routes remain. Realtime routes add normalized
  `departures`, `trips`, `vehicles`, and source freshness fields while retaining
  legacy `arrivals` projections for current consumers.

Direction enums contain machine semantics only. Contextual labels such as
“Uptown & The Bronx” are supplied separately at presentation time.

## Alternatives Considered

### Keep route-to-arrival arrays and reconstruct trips in the UI

Rejected because stop order, vehicle state, and exact trip association cannot
be reconstructed reliably after projection.

### Replace every API and component in one breaking migration

Rejected because it mixes data architecture with UI redesign and makes the
change difficult to verify or roll back.

### Put subway and bus fields into one optional-property interface

Rejected because inferred subway progress and actual bus GPS positions have
different semantics. The domain uses a small shared core plus discriminated
mode-specific trips and vehicle-position variants.

## Consequences

- A departure can be resolved to its complete trip without guessing.
- Current pages remain compatible during incremental migration.
- API payloads are larger because they can include full trip context; query
  limits and purpose-specific endpoints remain important.
- `/realtime` URL state can safely use the untouched upstream trip ID through
  `createRealtimeSearchParams`; consumers must not parse meaning out of it.
- The next UI phase should consume normalized fields directly and retire legacy
  projections only after every repository consumer has migrated.
