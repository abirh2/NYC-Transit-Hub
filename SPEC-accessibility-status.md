# Spec: Accessibility Status

## Objective

Modernize `/accessibility` around the rider question “What equipment outage
affects my trip or station now?” Current outages lead; upcoming work and route
planning remain available through progressive disclosure and Plan handoff.

## Functional Requirements

- Fetch current and upcoming outages once per refresh cycle through existing
  endpoints and preserve distinct semantics.
- Show station, affected lines, equipment type, serving/direction area when
  supplied, current/planned status, reason, estimated return, and updated time.
- Support cleanly backed filters: station search, subway line, equipment type,
  ADA-impacting only, and current/upcoming.
- Read and write `?station=<name or stable station context>` for deep linking.
- Offer Saved-station filtering using the existing preference hook when matches
  can be made by station identity/name; do not invent “Nearby” without a reliable
  station mapping.
- Replace the embedded Route Finder tab with a clear accessible-plan action that
  opens `/routes` with supported context.
- Expose a compact reusable station accessibility summary for Station Board and
  other rider surfaces without starting another polling loop.

## Testing Strategy

- Unit tests: current/upcoming parsing, filter composition, and station matching.
- Component tests: loading, feed unavailable, no outages, search/line/saved
  filters, URL hydration, updated time, and planner handoff.
- E2E: Station Board → matching accessibility state.

## Boundaries

- Always: treat an unavailable outage feed as unknown, never “all operational.”
- Never: conflate equipment IDs with station IDs or claim a full station is
  accessible solely because no outage appears.

## Success Criteria

- Current affected stations are the first substantive content on mobile.
- Filters are keyboard accessible and do not require an analytics summary table.
- Plan is the only planner UI while accessibility context remains visible here.
- Shared consumers receive data through props/adapters rather than refetching.

