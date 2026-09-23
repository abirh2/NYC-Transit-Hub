# Capability Map: Rider Utility Modernization

## Assumptions

1. `/routes` remains the canonical URL for the mobile-nav **Plan** destination;
   existing `/board`, `/accessibility`, `/commute`, and `/incidents` links remain valid.
2. The existing MTA OpenTripPlanner integration is the planner capability. The UI
   must report unsupported or unavailable results honestly rather than imply full
   Google Maps-style routing.
3. Local saved stations and authenticated saved commutes are related rider
   preferences, but remain distinct because they represent different data and use
   the existing localStorage and database persistence mechanisms respectively.
4. Subway Station Board is the primary station/departure modernization target.
   LIRR, Metro-North, and bus boards retain their existing specialized data paths
   while adopting compatible page chrome and shared rider language where safe.
5. `/incidents` remains the backwards-compatible service-change destination; its
   rider-facing hierarchy may be simplified without removing historical filters.
6. No database schema change, new dependency, or new geolocation subsystem is
   required.

## Modules

| Module id | Responsibility | Depends on |
|---|---|---|
| `rider-utility-foundations` | Shared station/location search contracts, URL-state helpers, saved-station controls, accessibility context, and utility data states | — |
| `station-board` | Focused station-complex departures, exact-trip links, saved-station entry, and compact contextual status | `rider-utility-foundations` |
| `plan-experience` | Canonical origin/destination planning, Home/Nearby context handoff, reload-safe query state, and rider-first itinerary results | `rider-utility-foundations` |
| `accessibility-status` | Current/upcoming equipment outages, supported filters, station deep links, and planner handoff | `rider-utility-foundations`, `plan-experience` |
| `commute-saved-transit` | Simple authenticated commute setup/status and consistent saved-transit language | `rider-utility-foundations`, `plan-experience`, `station-board` |
| `service-changes` | Rider-first active/upcoming service information with existing incident history preserved | `rider-utility-foundations` |

Build order: `rider-utility-foundations` → (`station-board`, `plan-experience`,
`service-changes`) → `accessibility-status` → `commute-saved-transit`

## Cross-module boundaries

- `types/transit.ts` remains the normalized transit source of truth. Platform
  stop IDs and internal directions do not become presentation contracts.
- Existing `/api/stations`, `/api/locations`, realtime, elevator, incident,
  commute, and trip-planning routes remain the data boundaries. UI work may add
  typed adapters or request coordination but must not duplicate upstream fetches.
- The route badges, semantic status tokens, layout primitives, and exact-trip
  deep-link helpers remain shared UI/domain dependencies.
- Reliability and Crowding are outside this initiative except when a shared
  primitive change must remain compatible with them.

