# Spec: Commute and Saved Transit

## Objective

Make `/commute` a simple setup-and-status surface for repeated authenticated
journeys while using consistent “Saved stations” terminology everywhere else.
Preserve the existing database commute model and local saved-station mechanism.

## Functional Requirements

- Keep sign-in, multiple saved commutes, default commute, edit, delete, and
  existing `/api/commute/*` persistence.
- Use the shared location search contract for commute endpoints; remove direct
  client geocoder duplication.
- Present configured commutes as origin → primary MTA route(s) → destination,
  with next useful departure/leave time and known service status.
- Link a commute into Plan with its known origin/destination context.
- Keep local saved stations separately editable through the existing station
  preference hook; never rename authenticated commutes to favorites.
- Use clear loading, authentication, no-commute, planner-unavailable, and stale
  realtime states.

## Testing Strategy

- Component tests: auth, empty setup, location selection, save/edit/delete,
  default commute, summary success, and unavailable planner.
- Integration tests: commute API contract remains unchanged.
- E2E: configured commute status → Plan and saved station → Station Board.

## Boundaries

- Always: keep ownership checks and existing authenticated persistence.
- Never: merge local saved stations into the database implicitly, create full
  routing logic in the client, or promise normal service from missing data.

## Success Criteria

- A configured commute's endpoints, route identity, next action, and status are
  understandable without expanding a large analytics card.
- Commute setup and Plan share location-search behavior and query context.
- “Saved stations” is used consistently for local station preferences.

