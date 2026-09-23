# Spec: Rider Service Changes

## Objective

Keep `/incidents` as the backwards-compatible rider service-change page while
making active and upcoming disruptions easier to scan. Preserve useful history
and filters without presenting the page as an analytics dashboard.

## Functional Requirements

- Lead with active service changes and affected MTA routes; upcoming planned
  work remains a distinct state.
- Preserve existing route, severity/type, date, and historical exploration where
  supported, but move secondary controls after immediate rider information.
- Render bracketed route references consistently with shared route badges.
- Use shared semantic status and empty/error/loading patterns.
- Link affected routes/stations into the relevant Realtime, Station Board, or
  Accessibility context only when stable identifiers are available.

## Testing Strategy

- Unit tests: active/upcoming/resolved timing semantics and filter composition.
- Component tests: current, planned, empty, unavailable, and route rendering.
- E2E: navigation from More and preservation of existing `/incidents` links.

## Boundaries

- Always: preserve alert active-time invariants and existing historical data.
- Never: modify Reliability/Crowding analytics or label feed health as service.

## Success Criteria

- Active rider-impacting changes precede statistics and historical controls.
- Current, upcoming, resolved, and unavailable states are distinct in text.
- Existing deep links remain valid and the page matches the shared rider visual
  language.

