# System Architecture

NYC Transit Hub turns several MTA products with different identifiers and semantics into one shared transit model. This document describes the implementation boundaries and the accuracy guarantees that matter to riders and maintainers.

## End-to-end data flow

```text
MTA static GTFS      MTA GTFS-Realtime      MTA Bus Time      MTA JSON feeds
(stops/routes/shapes) (subway + commuter)   (SIRI)            (alerts/equipment)
         \                    |                 |                    /
          +-------------------+ source adapters +-------------------+
                                      |
                         normalized transit domain
                     Departure / Trip / Vehicle / Station
                                      |
                           shared realtime services
                              /                 \
                  rider experience          visualization and analytics
             Home / Nearby / Plan / Board   maps / diagrams / trends
```

1. `lib/mta/` fetches and validates source-specific protobuf, SIRI, and JSON responses.
2. `lib/gtfs/` supplies static stations, stops, route sequences, schedules, and shape geometry.
3. Adapters under `lib/transit/` map source fields into `types/transit.ts`.
4. Thin handlers under `app/api/` filter and serialize the normalized result.
5. Feature components consume the same trip, departure, vehicle, station, health, and freshness semantics.

PostgreSQL on Supabase is accessed through Prisma for configured account, commute, ingestion, and historical-analysis flows. Live rider features can read MTA sources directly and do not silently substitute database history for a current feed.

## Domain model

### Station and stop

A `TransitStation` is the rider-facing complex. It can contain multiple source complex IDs and directional platform `stops`. Names are labels, not unique identifiers. Search merges same-name complexes and retains all source IDs; Station Board queries every relevant platform and deduplicates the result by `tripId`.

A stop is a boardable, source-addressable location. Bus nearby discovery starts with static GTFS stops, caps the selected IDs, and asks SIRI StopMonitoring for those stops. Geographic vehicle proximity is not used as a substitute for boarding data.

### Departure, trip, and vehicle

- A `Departure` is one prediction at one stop.
- A `TransitTrip` is one individual run with route, direction, destination, ordered stop updates, and source identity.
- A `TransitVehicle` represents a vehicle associated with a trip. Its position records whether coordinates are `actual` or `inferred`.

The same `tripId` connects a prediction, selected train or bus, line diagram, and map detail. Selection and React keys preserve this identity across refreshes.

## Positioning accuracy

### Subway: estimated geography

MTA subway GTFS-Realtime reports individual trips, stop-time predictions, and operational progress; it does not provide consumer GPS coordinates. `lib/transit/subway-trip-position.ts` determines the adjacent stops and a conservative progress value. `lib/gtfs/subway-route-geometry.ts` can project that progress onto a compatible official static GTFS shape. If no shape matches, the projector falls back to the station-to-station segment.

Therefore:

- the trip identity and operational progress are realtime;
- the geographic point between stops is estimated;
- no UI or documentation may describe a subway marker as GPS or exact.

Static route artifacts are loaded by route and cached separately from realtime updates, so a 30-second feed refresh does not reparse or refetch the geometry.

### Bus: reported coordinates

MTA Bus Time provides reported vehicle coordinates where available. Those coordinates can drive map markers. Predictions, next-stop roles, and stops-away wording come from SIRI fields. The app keeps `MonitoredCall` (the requested boarding stop) separate from `OnwardCall` (normally the vehicle's next stop).

## Feed health and partial failure

Normalized snapshots use `ok`, `stale`, `empty`, `unavailable`, or `malformed` source states. An empty list is not automatically treated as a healthy “no service” result. Multi-source views keep successful modes or stops visible when a sibling request fails.

Alerts follow exact time semantics:

```text
active   = (no start or start <= now) and (no end or end > now)
upcoming = start > now
resolved = end exists and end <= now
```

## Realtime lifecycle

Client polling uses a shared visibility- and connectivity-aware hook:

- one interval runs only while the document is visible and online;
- hiding the document or going offline stops the interval;
- returning visible or online triggers one immediate refresh before restarting;
- cleanup removes timers and listeners.

Primary Home, Nearby, Station Board, Realtime, Accessibility, Reliability, and Service Changes surfaces use this contract. Static station and geometry lookups remain independent from realtime polling where their ownership differs.

Freshness comes from source or successful-request timestamps. UI states distinguish a normal update, delayed realtime, unavailable data, and “Realtime unavailable offline.” A failed refresh can preserve previously usable context, but it cannot keep presenting an old ETA as live.

## PWA caching

`app/sw.ts` is the service-worker source; generated `public/sw.js` and Workbox output are never edited directly. `lib/transit/cache-policy.ts` classifies requests:

| Class | Examples | Strategy |
|---|---|---|
| Realtime | arrivals, vehicles, alerts, incidents, train progress | Network first, short maximum age |
| Slow-changing | reliability, crowding, status, commute summary | Network first, bounded longer age |
| Static transit | stations, routes, bus stops, GTFS geometry | Stale-while-revalidate / longer age |
| Unknown API | unclassified endpoints | Network only |

Offline use retains the shell and cached static context. Realtime predictions are explicitly unavailable rather than treated as current.

## Rendering and module boundaries

- Server Components are the default route shell; client components own browser state, maps, polling, and interactions.
- `components/ui/` contains product-wide primitives; `components/analytics/` contains small reusable chart/freshness patterns.
- Leaflet and chart code stays inside the routes that use it. Realtime maps lazy-load their browser-only canvas.
- Route-specific shaping stays close to the feature rather than growing a generic dashboard framework.
- External data is validated with Zod at the boundary; Prisma is the only database abstraction.

## Testing and operating evidence

- Vitest covers adapters, normalization, geometry matching, cache classification, polling, and component behavior.
- React Testing Library checks accessible state, selection, links, and partial-failure presentation.
- Playwright covers representative rider flows in a real browser.
- Production builds verify Next.js and Serwist integration.
- Current MTA responses are checked only through diagnostic scripts or sanitized fixtures; credentials and raw user data are never committed.

See [API Contracts](./api.md), [Transit Domain Conventions](./ai/transit-domain.md), and [Testing](./testing.md) for narrower contracts.
