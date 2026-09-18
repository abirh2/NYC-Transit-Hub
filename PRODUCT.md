# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

NYC riders checking nearby service while walking, waiting, or deciding which
station, direction, or vehicle to use. The primary job is to understand the
next useful transit option quickly, often one-handed on a mobile device.

## Product Purpose

NYC Transit Hub combines MTA location, realtime, trip, and route information so
riders can discover nearby service and follow a specific train or bus without
losing spatial context.

## Operating Context

Nearby is a map-first surface used in motion. Riders scan route identity,
direction, destination, and arrival time before they inspect supporting detail.
The map, selected boarding place, and exact trip must remain connected as the
interface moves from nearby discovery into train context.

## Capabilities and Constraints

- Existing Station, Stop, Direction, Departure, Trip, and Vehicle models are
  authoritative; presentation work must not duplicate or replace them.
- Station complexes retain all source and platform identifiers, and departures
  remain deduplicated by exact `tripId`.
- The app uses MTA realtime and GTFS-derived data and must represent stale,
  partial, empty, and unavailable states honestly.
- Subway positions inferred from trip progress and GTFS geometry are estimates,
  not GPS locations.
- Existing exact `/realtime` trip routes remain the full-detail destination.

## Brand Commitments

Use NYC Transit Hub's existing semantic color tokens, MTA route identities,
plain rider language, and dark/light themes. Transit screenshots supplied for
Nearby are interaction references, not branding or assets to copy.

## Evidence on Hand

- Existing application routes, components, transit domain types, and automated
  tests in this repository.
- User-supplied Transit screenshots showing a collapsed map-plus-arrivals state
  and an expanded selected-train map state.
- No permission to fabricate service quality, crowding, payment, ranking, or
  recommendation claims that are not supported by current product data.

## Product Principles

- Lead with the rider's next decision, not feed or implementation metadata.
- Keep realtime information spatially adjacent to its selected place.
- Preserve exact trip identity through every selection and detail transition.
- Reveal secondary times and diagnostics only when they help the current task.
- Make the primary flow operable by touch, keyboard, and familiar repetition.

## Accessibility & Inclusion

Meet WCAG 2.1 AA expectations, preserve semantic controls and visible focus,
avoid color-only meaning, and keep mobile touch targets at least 44px.
