# Spec: Station Board

## Objective

Turn `/board` into a focused “what is happening at this station?” experience.
For a selected subway station, riders see the station complex name, routes,
directional departures, save/remove action, and relevant accessibility/service
context without raw GTFS details or duplicated Nearby layout.

## Functional Requirements

- Read and write `?station=<stable station id>` while preserving direct links.
- Search stations by name using station-complex results; show route bullets and
  useful context for ambiguous names.
- Offer saved stations before search results and keep nearby suggestions only
  through the existing geolocation hook/data path.
- Fetch every represented platform/source ID and deduplicate by exact `tripId`.
- Group subway departures into two rider-facing direction sections; each row
  reuses the shared departure presentation and opens the exact train detail.
- Show compact relevant accessibility context when current outage data can be
  matched safely; outage failure must not block departures.
- Preserve LIRR, Metro-North, and bus tabs and their existing data capabilities.

## Presentation

- Compact mobile header; selected station and routes precede controls.
- No generic introductory card, internal IDs, raw direction codes, or trip IDs.
- Empty/error/loading states appear in the relevant section, not as page-wide
  raw errors.

## Testing Strategy

- Component tests: search, ambiguous results, selection, URL hydration, saved
  station action, two directions, empty/unavailable data, and exact-trip link.
- Unit tests: station query parsing and multi-platform trip deduplication.
- E2E: saved station → Station Board → exact train → Realtime.

## Boundaries

- Always: preserve station-complex semantics and 30-second freshness conventions.
- Never: replace rail/bus domain logic, create a new location prompt, or treat
  station names as identifiers.

## Success Criteria

- A selected station's useful departures are visible within the first mobile
  viewport after its compact identity header.
- Every departure link retains the source `tripId`.
- Nearby, saved, and searched stations select the same board state and URL.
- The page no longer exposes old oversized cards or duplicated explanatory copy.

