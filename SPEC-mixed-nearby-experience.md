# Spec: Mixed Subway and Bus Nearby Experience

Module ID: `mixed-nearby-experience`

## Objective

Turn `/nearby` into a coherent feed of practical subway stations and bus-stop
locations around the rider. Locations are ranked by walking proximity, while
each location foregrounds its next boardable departure. Mode filtering is
optional, failures are isolated, and subway remains fully usable without bus
realtime data.

## Tech Stack

- Next.js 16 App Router and React 19
- HeroUI 2, Tailwind CSS 4, existing design tokens and shared surfaces
- Existing `useGeolocation` session
- `BusBadge`, `SubwayBullet`, shared status and empty/error primitives
- Impeccable Operate-mode quality and accessibility checks

## Commands

- Component tests: `nvm use 24 && npx vitest run tests/components/NearbyClient.test.tsx tests/components/NearbyBusCard.test.tsx`
- Unit tests: `nvm use 24 && npx vitest run tests/unit/nearby.test.ts tests/unit/nearby-bus-stops.test.ts tests/unit/nearby-bus-realtime.test.ts`
- E2E: `nvm use 24 && npx playwright test tests/e2e/nearby-bus.spec.ts`
- Lint: `nvm use 24 && npm run lint`
- Typecheck: `nvm use 24 && npx tsc --noEmit`
- Build: `nvm use 24 && npm run build`

## Project Structure

- `app/nearby/page.tsx` — multimodal metadata and thin page shell
- `components/nearby/NearbyClient.tsx` — shared geolocation and mode state
- `components/nearby/NearbyLocationCard.tsx` — common location hierarchy
- `components/nearby/BusDepartureCard.tsx` — bus-specific semantics
- `lib/transit/nearby.ts` — mode-neutral sorting and next-departure helpers
- `tests/components/`, `tests/e2e/` — behavior and browser verification

## Contract and Code Style

The UI consumes a discriminated union instead of forcing bus stops into subway
station semantics:

```ts
type NearbyLocation =
  | { mode: "subway"; station: TransitStation; distanceMiles: number }
  | { mode: "bus"; stopGroup: NearbyBusStopGroup; distanceMiles: number };
```

- Shared components own only genuinely shared layout and state.
- Subway direction tabs remain subway-specific.
- Bus destination/headsign and directional stop copy remain bus-specific.
- Route identity always includes readable text; color is supplemental.

## Functional Requirements

1. Request browser location once and reuse it for both modes.
2. Load subway and bus discovery independently and preserve partial results.
3. Default to an “All” feed sorted primarily by physical distance.
4. Offer lightweight All/Subway/Bus filtering without requiring a choice first.
5. Each location clearly identifies mode, name/intersection, distance, walking
   time, and routes served.
6. A bus location’s primary content is its chronologically next useful bus:
   route, ETA, destination, and stops-away/approach copy.
7. Additional bus arrivals expand in chronological order across routes and link
   to their exact trips/vehicles.
8. Avoid a mandatory route picker before showing bus predictions.
9. Limit initial density and lazy-load or select realtime detail so Nearby does
   not poll every city stop independently.
10. Bus failure leaves subway content and a localized recovery message intact;
    subway failure similarly leaves available bus content intact.
11. Refresh updates data without replacing stable selections due to reordered
    arrays.
12. Cards and filters are keyboard operable, route identity is not color-only,
    updates do not spam live regions, and map content is not required to
    understand an arrival.
13. Mobile and desktop use the incumbent NYC Transit Hub visual language.

## Testing Strategy

- Component-test mixed sorting, filters, one-route and multi-route stops,
  expansion, selection, partial failures, and preserved subway behavior.
- Use deterministic dense-Manhattan fixtures to assert bounded rendered cards
  and bounded realtime requests.
- E2E covers mixed results, opposite-direction stops, exact bus selection,
  moving actual bus marker, following buses, browser back, subway regression,
  and bus failure isolation.
- Browser inspection covers desktop and mobile layout, focus order, accessible
  names, console/network errors, and concrete duplicate requests.

## Boundaries

- Always: preserve independent mode states; lead with the next useful arrival;
  reuse distance/walking helpers and existing visual primitives.
- Ask first: replacing the incumbent Nearby information architecture or adding
  a new mapping/design dependency.
- Never: create unrelated subway and bus mini-apps; require route selection
  before any bus ETA; announce every polling update; hide identity behind color.

## Success Criteria

- A rider near both modes sees a coherent proximity-ranked feed by default.
- One-route, multi-route, and opposite-direction bus locations remain clear.
- The next bus is visually dominant and additional arrivals are available.
- A bus outage does not blank or disable subway results.
- Dense Manhattan fixtures stay within explicit request and card-count bounds.
- Desktop and mobile browser checks pass without console errors, inaccessible
  controls, overflow, or regressions to subway Nearby.

## Open Questions

- None blocking. The visual design will extend the incumbent Nearby hierarchy;
  browser testing will determine whether grouped stop directions read best as
  inline labels or a compact secondary selector.
