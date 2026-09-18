# Spec: Map-first Nearby experience

## Assumptions

1. This is a focused redesign of the existing `/nearby` surface, not a new
   trip-planning or realtime-data capability.
2. The closest discovered subway station is the initial subway context; a map
   station selection may replace it without changing the discovery API.
3. A rider selects a service in place on first press. A separate, explicit
   detail action opens the existing exact `/realtime` deep link.
4. The supplied Transit screenshots define information hierarchy and
   interaction philosophy, not a visual identity to copy.
5. The user's instruction to continue without review pauses is approval to move
   through specify, plan, task, and implementation gates using this brief.

## Objective

Rebuild `/nearby` into a location-aware transit surface that answers “Where am
I?”, “What transit is around me?”, and “What comes next?” in the first mobile
viewport. The page opens with a contextual nearby map and flows directly into
flat, arrival-first subway and bus service rows. Boarding locations, walking
distance, freshness, and progress remain visible as supporting context.

The redesign preserves the Phase 3 data and identity contracts: one
geolocation session, subway and bus discovery, grouped stops/stations,
independent realtime failures, exact subway `tripId`, exact bus `tripId` and
`vehicleId`, polling cadence, direction semantics, and existing `/realtime`
deep links.

## Tech Stack

- Next.js 16 App Router, React 19, strict TypeScript
- HeroUI 2 and Tailwind CSS 4 with existing semantic tokens
- Existing React Leaflet / Leaflet map stack
- Existing subway GTFS shape loader and route projection utilities
- Existing bus actual-position model and route/deep-link utilities
- Vitest, React Testing Library, and Playwright

## Commands

- Focused unit tests: `nvm use 24 && npx vitest run tests/unit/nearby.test.ts`
- Focused component tests: `nvm use 24 && npx vitest run tests/components/NearbyDepartureRow.test.tsx`
- Relevant E2E: `nvm use 24 && npx playwright test tests/e2e/nearby-bus.spec.ts`
- Lint: `nvm use 24 && npm run lint`
- Typecheck: `nvm use 24 && npx tsc --noEmit`
- Full tests: `nvm use 24 && npm run test`
- Production build: `nvm use 24 && npm run build`

## Project Structure

- `app/nearby/page.tsx` — thin, map-capable route shell without redundant
  mobile page introduction
- `components/nearby/NearbyClient.tsx` — geolocation, discovery, realtime,
  selection, filtering, and map/list synchronization
- `components/nearby/NearbyMap.tsx` — map orchestration, route context, fit,
  recenter, and lightweight overlays
- `components/nearby/NearbyMapCanvas.tsx` — client-only Leaflet layers reusing
  existing tiles, marker builders, geometry, and theme tokens
- `components/nearby/NearbyDepartureRow.tsx` — shared flat service-row hierarchy
  with mode-specific route identity and exact detail action
- `lib/transit/nearby.ts` — framework-free service grouping and ordering
- `tests/unit`, `tests/components`, `tests/e2e` — behavior and browser proof

## Code Style

Use a discriminated presentation model and keep domain identity intact:

```ts
type NearbyService =
  | { mode: "subway"; locationId: string; departure: Departure }
  | { mode: "bus"; locationId: string; departure: Departure };
```

- Prefer existing route bullets, bus badges, marker builders, colors, and
  geometry helpers over new primitives.
- Keep fetch/state orchestration in `NearbyClient`; keep row rendering and map
  rendering presentational.
- Use semantic buttons and links with visible focus. Never nest interactive
  controls.
- Use tabular numerals for ETA. Route identity always includes readable text;
  color remains supplemental.

## Functional Requirements

1. Mobile opens with a live map occupying approximately 35–45% of the usable
   viewport; desktop uses a sticky map beside a service panel.
2. The map shows user location, bounded nearby subway stations, and useful bus
   stop groups. It must not become a full-system explorer.
3. A selected subway service adds route geometry and a selected train marker
   when existing normalized progress supports projection.
4. A selected bus service highlights its boarding group and actual vehicle
   position when the existing realtime result contains one.
5. A floating “Where to?” control routes to `/routes` and remains reachable
   without becoming a page-level form.
6. Results directly below/beside the map are flat service rows. Each row leads
   with route identity, destination/direction, and a dominant next ETA; the
   station/stop name, walking context, and stops-away text are secondary.
7. Do not render numbered station/stop rankings or nested departure cards.
8. The default view includes both modes. If filtering remains, it is compact,
   secondary, and never required before useful results appear.
9. First press selects a service, updates map context, preserves related rows,
   and scrolls from a selected map object to its corresponding row where
   practical.
10. A separate detail link opens the existing exact train or bus `/realtime`
    URL and preserves Trip/Vehicle identity.
11. Loading, location denied, empty, partial failure, stale, and total failure
    states preserve the map/results composition and never hide available mode
    data.
12. Natural page scrolling wins over the map on mobile; map controls and all
    content clear the fixed bottom navigation and safe areas.

## Testing Strategy

- Unit-test deterministic service grouping, primary-arrival selection,
  deduplication, and stable ordering without React.
- Component-test dominant ETA hierarchy, first-press selection, explicit exact
  detail links, and accessible route/destination names.
- Extend Playwright coverage for map-first ordering, absent numbered location
  cards, mixed service visibility, exact bus detail links, selection state,
  compact filters, mobile overflow, and destination navigation.
- Browser-inspect at 390×844 and desktop widths. Verify console, accessibility
  tree, map/list synchronization, touch targets, and bottom-nav clearance.

## Boundaries

- Always: preserve normalized IDs and independent mode failures; reuse map and
  geometry infrastructure; keep map content supplementary to textual arrivals.
- Ask first: add a dependency, change an API/data contract, change polling
  cadence, or broaden `/routes` into new journey-planning work.
- Never: edit generated PWA files; fabricate vehicle positions; derive stop
  distance from bus GPS; expose raw `tripId` in rider-facing row copy; copy
  Transit branding or proprietary visual assets.

## Success Criteria

- At 390×844, user location/map context and at least one useful arrival are
  visible or clearly beginning within the first viewport.
- No page description, large location card, numbered station list, or dominant
  filter row appears before realtime service.
- Subway and bus rows use the same flat visual grammar and a visibly dominant
  next ETA.
- Selecting a subway trip or bus vehicle visibly updates both row and map while
  preserving exact detail navigation.
- Dense Midtown, subway+bus, filtered modes, denied location, loading, partial
  failure, and small-width layouts pass automated and browser verification.
- Lint, typecheck, focused tests, full tests, production build, and relevant
  Playwright coverage pass.

## Open Questions

None blocking. Full destination planning remains delegated to `/routes`.

---

## Primary Subway Interaction Addendum

### Interaction correction: route-first service cards

The primary subway surface is route-first, not station-direction-first. A selected
station may expose several nearby routes (for example B, D, F, and M), and each
route is rendered as its own independently scannable card. The Uptown/Down­town
swipe or tab control belongs inside that route card and changes only that route's
hero departure and supporting departures. Station identity and freshness are
shared context above the cards; one station-level rail must not combine routes.

### Objective

For the selected nearby subway station, replace the flat set of disconnected
subway rows with one station-local service panel. The panel pages horizontally
between complete directional contexts, makes one exact upcoming train dominant,
and expands the existing map when that train is selected. Bus presentation and
all existing data contracts remain unchanged.

The supplied Transit screenshots are interaction references. This implementation
adopts their map-to-service continuity, route-led hierarchy, dominant ETA, and
progressive disclosure while retaining NYC Transit Hub's own visual system and
omitting Transit-specific branding, rankings, gamification, and unsupported
service claims.

### Functional Requirements

1. The selected station name, direction controls, hero departure, and secondary
   departures render together in the existing Nearby results panel.
2. Each available direction is one full-width snap page. Touch scrolling changes
   the whole service context, while semantic tabs/buttons provide keyboard and
   pointer fallback and visibly identify the active direction.
3. Vertical page scrolling remains natural when a gesture starts on the pager.
4. Each direction page leads with exactly one hero departure: large route
   identity, rider-facing direction, destination, and a dominant ETA. It does
   not show raw trip, stop, feed, or internal direction identifiers.
5. Secondary context is limited to useful, supported data such as freshness or
   stops-away. No unsupported service-quality claim is invented.
6. Additional departures stay hidden by default and expand compactly within the
   same direction page. The expansion state is retained when the user changes
   direction and returns.
7. Every displayed departure preserves an exact `/realtime` trip link. Tapping
   the hero first selects that exact train in Nearby and reveals an explicit
   full-detail action rather than navigating immediately.
8. Selecting the hero expands map prominence on mobile, highlights the exact
   train, boarding station, route, and user location, and renders other
   positionable same-route trains with lower emphasis. Upcoming times remain in
   the results panel below the map.
9. Changing the selected station resets train expansion to the new station's
   current service context without losing the surrounding Nearby surface.

### Testing Strategy

- Component-test direction tabs, snap pages, hero hierarchy, absence of raw IDs,
  retained per-direction expansion, exact links, and hero selection.
- Extend Nearby Playwright coverage for direction switching, hero expansion,
  compact times, exact train detail routing, mobile overflow, and map prominence.
- Browser-inspect the supplied mobile reference hierarchy at 390×844 and the
  desktop split at 1280px. Verify focus, vertical scroll behavior, console, and
  route/train map emphasis.

### Success Criteria

- A selected station and its next directional train are adjacent and visible
  without scrolling to a second details section.
- Swiping or activating a direction tab changes route, destination, ETA, and
  secondary times as one context.
- The hero ETA is the strongest typographic element in the service panel.
- No normal Nearby state exposes a raw `tripId`, stop ID, feed ID, or machine
  direction label.
- Selecting a hero expands the map around that exact train and exposes one clear
  link to the existing full train detail experience.
- Focused component tests, lint, typecheck, production build, and relevant
  Playwright coverage pass.

### Boundaries

- Always: preserve existing normalized transit models, polling, failure
  isolation, geometry, and exact deep-link behavior.
- Ask first: add a dependency, change a transport contract, infer new service
  claims, or replace the existing full train detail route.
- Never: copy Transit assets/branding, expose internal identifiers, or fabricate
  train coordinates.

### Open Questions

None blocking. The user supplied the missing reference screenshots and asked for
uninterrupted implementation.
