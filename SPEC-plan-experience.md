# Spec: Plan Experience

## Objective

Make `/routes` the coherent mobile-nav **Plan** experience: “Where from?”,
“Where to?”, then “Plan.” Preserve the current MTA OpenTripPlanner capability,
communicate its availability honestly, and present itineraries around rider
decisions rather than routing-engine structure.

## Functional Requirements

- Use the existing server-side `/api/locations` search for NYC stations, places,
  addresses, intersections, and landmarks; do not call Nominatim from clients.
- Accept valid residential street-address results even when the geocoder omits
  a place name; derive the label from house number and street and retain the
  neighborhood, borough, and ZIP context.
- Read and write reload-safe `from`, `to`, `fromLat`, `fromLon`, `toLat`, and
  `toLon` query state when coordinates are known.
- Accept context from Home/Nearby/Station Board without asking the rider to
  re-enter a known origin.
- Preserve swap, accessible-only, and itinerary planning behavior supported by
  `/api/routes/trip`.
- Present known total duration, departure/arrival, walking legs, MTA route
  identity, transfers, destination/headsign, and accessibility warnings.
- Treat durations and times as planner results, not guarantees; show a concise
  unavailable/no-supported-route state.
- Accessibility routes link into Plan with the accessible preference enabled;
  the Accessibility page does not embed a second planner instance.

## Presentation

- One compact page title and a linear mobile-first form.
- Remove the large tips card; keep only short inline help when selection from
  search results is required.
- Use route badges and a compact itinerary summary before expandable detail.

## Testing Strategy

- Unit tests: query-state parsing/serialization and planner result formatting.
- Component tests: origin/destination selection (including keyboard acceptance
  of a residential address), swap, context hydration, accessible preference,
  success, no route, and unavailable upstream.
- E2E: Home/Nearby “Where to?” → Plan with preserved origin context.

## Boundaries

- Always: preserve the current OTP API and its supported mode/accessibility flags.
- Never: fabricate fares, crowding, reliability, step-free guarantees, GPS,
  traffic, or turn-by-turn capability not returned by the planner.

## Success Criteria

- The form's hierarchy is exactly origin → destination → Plan.
- Context-bearing links prefill known fields and survive reload/back navigation.
- A rider can search for and select a full NYC residential address in either
  origin or destination, including address-only geocoder records.
- Results emphasize duration, route, transfer, wait/departure, destination, and
  walking only when those values are present.
- No client directly calls an external geocoder.
