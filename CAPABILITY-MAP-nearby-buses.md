# Capability Map: Nearby MTA Buses

## Objective

Extend `/nearby` from subway-only discovery into a coherent nearby-transit
experience that starts with boardable bus stops, preserves individual bus trip
and vehicle identity, and uses actual reported bus coordinates in the existing
Live Tracker.

## Modules

| Module ID | Responsibility | Depends on |
|---|---|---|
| `nearby-bus-stops` | Discover, normalize, group, rank, and limit nearby directional bus stops while retaining every stop ID required for predictions. | — |
| `nearby-bus-realtime` | Fetch stop-level SIRI predictions efficiently, normalize rider-facing progress and stops-away data, preserve departure/trip/vehicle identity, and isolate upstream failures. | `nearby-bus-stops` |
| `nearby-bus-detail` | Open an exact predicted bus in Live Tracker, focus the actual vehicle and boarding stop, preserve selection across refresh, and handle passed/disappeared buses. | `nearby-bus-realtime` |
| `mixed-nearby-experience` | Present subway stations and bus stop groups as one responsive, accessible nearby feed with optional mode filtering and independent loading/error states. | `nearby-bus-stops`, `nearby-bus-realtime`, `nearby-bus-detail` |

Build order: `nearby-bus-stops` → `nearby-bus-realtime` →
`nearby-bus-detail` → `mixed-nearby-experience`.

## Cross-cutting constraints

- Stop-first discovery is mandatory. Geographic vehicle proximity must never
  determine which buses are boardable nearby.
- Static GTFS stop/route/shape data and Bus Time SIRI remain the authoritative
  integrations. No database migration or new production dependency is planned.
- Static metadata and realtime predictions use separate cache policies.
- Every module includes deterministic Vitest coverage; browser verification
  covers the completed mobile and desktop rider flow.
- Existing subway Nearby behavior remains available if bus data fails.

## Deferred capability

Multimodal recommendation scoring that combines walking time and wait time is
not part of this initiative. The normalized result model must allow that later
ranking layer without changing stop, departure, trip, or vehicle identity.
