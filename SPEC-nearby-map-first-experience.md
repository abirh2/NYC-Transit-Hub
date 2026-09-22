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

---

## Transit-faithful Route Interaction Correction (Authoritative)

This correction supersedes the Primary Subway Interaction Addendum wherever it
requires visible direction tabs, a disclosure button, or hidden secondary
departures. It also supersedes Phase 7 planning language that says direction
controls must be visibly rendered above a route. The user-provided screenshots
and the Transit behavior documented below are the visual and interaction source
of truth for this refinement.

### Reference evidence

- Collapsed reference:
  `/Users/ahossain/Downloads/Screenshot 2026-09-16 at 1.48.18 PM.png`
- Selected-route reference:
  `/Users/ahossain/Downloads/Screenshot 2026-09-16 at 1.48.56 PM.png`
- Transit documents that its home screen shows nearby lines and their next
  departure, that each line changes direction by a horizontal swipe, and that
  tapping a line opens later departures:
  <https://help.transitapp.com/article/93-how-to-use-transit>
- Transit documents that upcoming departures in the selected route view are
  horizontal ETA cards and that selecting a card changes the exact departure:
  <https://help.transitapp.com/article/549-how-to-use-go>

These are behavior and hierarchy references only. NYC Transit Hub must not copy
Transit branding, colors, proprietary icons, rankings, GO, payment/crowding
claims, or other unsupported data.

### Objective

Make the shortest path from nearby discovery to an exact train feel as direct
as the Transit references: scan one row per route, swipe the row to inspect the
opposite direction, tap the row, then choose an exact upcoming ETA from a
horizontal strip while the map expands around that service.

### Collapsed route contract

1. Render exactly one full-width row for each route at the selected station.
2. The row contains the route bullet, active rider-facing direction,
   destination, station name, and one dominant next ETA.
3. Do not render visible direction tabs, segmented controls, direction chips,
   pagination dots, or a direction header above the row.
4. When a route has two reported directions, horizontal swipe changes the
   entire row to the other direction. The same rail supports Left/Right and
   Home/End keys and exposes its current direction in its accessible name.
5. Swiping one route never changes another route.
6. Vertical page scrolling remains natural when the gesture is primarily
   vertical.

### Selected route contract

1. Tapping the row selects its exact next `tripId` and expands the map using the
   existing selected train, route geometry, station, and user-location logic.
2. The selected row becomes a compact route/direction header. It must not repeat
   the selected ETA both in the header and in the ETA strip.
3. Immediately beneath that header, render up to six available departures for
   the active direction as horizontally scrollable ETA cards. No accordion,
   “show other departures,” “show more,” or “hide departures” control appears.
4. ETA cards show only decision-critical time content. Exact destination and
   trip identity remain available to assistive technology.
5. The active ETA card uses a neutral selected surface plus the route color as
   a restrained border/accent. Route color is never the only selected signal.
6. Tapping another ETA card selects that exact departure, updates map context
   when positionable, and updates the existing exact Train details link.
7. Train details is the sole schedule/detail escape. No separate full-schedule
   disclosure is added to the Nearby row.
8. Collapsing the map returns to the compact next-departure list; the active
   route direction remains local to its row while that row stays mounted.

### Visual acceptance criteria

- At 390×844, the collapsed state matches the reference hierarchy: map/search,
  then uninterrupted route rows with no direction-control band between the
  shared header and the first route.
- Each collapsed route row is approximately one 96px service unit; no extra
  44px direction tab row or disclosure row is present.
- Selected state reads as map → route/direction header → horizontal ETA cards,
  with the cards visible without pressing another control.
- The first ETA is dominant in the collapsed state. In the selected state,
  each available ETA is peer-selectable and the active card is unmistakable.
- The UI uses NYC Transit Hub tokens, MTA bullets, and existing typography. It
  emulates Transit’s layout and gesture model, not its orange visual identity.
- Dark and light themes, 375/390/430/768/1280 widths, bottom-nav clearance,
  reduced motion, touch, keyboard, and screen-reader operation remain valid.

### Testing strategy

- Component tests assert the absence of tablists and disclosure buttons.
- Component tests verify independent route rails, keyboard direction changes,
  immediate selected ETA cards, exact alternate-departure selection, and exact
  Train details links.
- Playwright verifies row-level direction switching, no horizontal page
  overflow, map expansion, ETA-card selection, exact deep-link updates, and
  screenshots of collapsed, opposite-direction, and selected states.
- Final screenshot comparison treats any reintroduced direction band or
  disclosure row as a release-blocking regression.

### Boundaries

- Always: preserve current models, APIs, polling, trip identity, route geometry,
  map behavior, theme tokens, 44px touch targets, and accessible alternatives
  for swipe.
- Ask first: add a new data source, new dependency, full schedule surface, or
  GO-style navigation workflow.
- Never: fabricate unsupported service metadata, duplicate an ETA in the
  selected header and ETA strip, or reintroduce visible route direction tabs or
  a departure disclosure button.

### Open questions

None. The screenshots and direct correction settle the intended interaction.

---

## Map-Centered Nearby Exploration (Authoritative)

### Objective

Let riders inspect service around any NYC point without pretending that the
device physically moved there. The map center becomes the Nearby search origin
after a drag, and the existing map-bottom bar becomes a combined station/place
search instead of a link to the trip planner.

Transit documents the same core outcome: riders can search for a destination
and show nearby lines there, and its location workflows support placing a pin
with the map. These references define the interaction model, while NYC Transit
Hub keeps its own map, tokens, and realtime data model:

- <https://help.transitapp.com/article/93-how-to-use-transit>
- <https://help.transitapp.com/article/95-save-your-favorite-locations>

### Interaction contract

1. The map is pannable by touch, mouse, and keyboard-supported Leaflet controls.
2. A fixed visual pin marks the map center. After a user drag ends, that center
   becomes the active search origin and nearby subway stations and bus stops
   reload once for the new coordinates.
3. Programmatic map movement caused by fitting markers, selecting a service, or
   expanding a train never changes the search origin.
4. The locate control restores the active search origin to the latest device
   position, recenters the map, and reloads nearby results.
5. The map-bottom control is a search field labelled “Search location or
   station.” It no longer navigates to `/routes`.
6. Search suggestions combine normalized MTA subway station complexes with NYC
   addresses/places. Each result exposes its kind and a concise secondary label.
7. Selecting a suggestion recenters the map, makes its coordinates the active
   search origin, closes the suggestion list, and refreshes nearby results.
8. Device location and search origin remain distinct: the blue location marker
   continues to represent the actual device, while the center pin represents
   the area being explored.
9. If device location is unavailable, manual search and map exploration remain
   usable from a neutral NYC starting view; no fake user marker is shown.
10. Changing origin clears stale service/trip selection before new results are
    presented. Existing polling resumes against the newly discovered stops.

### Location search API contract

- `GET /api/locations?query=<text>&limit=<1..10>`
- `query` is trimmed, 2–100 characters, and validated at the route boundary.
- Results are a discriminated union:
  - `station`: stable station id, normalized complex name, coordinates, and
    station id.
  - `place`: stable provider-derived id, concise place name/description, and
    validated NYC-bounded coordinates.
- The external geocoder host is fixed server-side; callers cannot supply a URL.
  Third-party responses are schema-validated, cached, bounded, and treated as
  unavailable without discarding valid station matches.
- No search query or precise coordinate is persisted by this feature.

### Visual and accessibility acceptance

- The center pin is visually clear without obscuring map labels and lifts only
  while the map is actively dragged.
- Suggestions open above the bottom search field so they remain inside the map
  and above mobile navigation.
- Search supports keyboard focus, loading, empty, error, Escape, and selection
  states; results announce station versus place without relying on icons alone.
- The search origin label is reflected in the departures header/status copy.
- Existing route rows, ETA cards, themes, selected train map, and bottom-nav
  clearance remain unchanged.

### Testing strategy

- Unit tests validate query bounds, geocoder response parsing, NYC coordinate
  bounds, result discrimination, and station-only fallback.
- Component tests cover search debounce, result rendering, keyboard-accessible
  selection, empty/error recovery, and callback coordinates.
- Playwright drags the real Leaflet map and selects a mocked station/place,
  asserting that subsequent station and bus discovery requests use the new
  origin while the actual user marker remains distinct.

### Boundaries

- Always: retain exact trip/station identity, current polling limits, fixed
  external host allowlisting, React escaping, and location-data minimization.
- Ask first: persist searched locations, add favorites, change geocoder
  providers, or turn this field back into a full trip-planning workflow.
- Never: move the user-location marker to a searched point, refetch continuously
  during drag, or let programmatic map animation mutate the active origin.

### Open questions

None. “Location” means an NYC address/place or subway station, and selection is
for Nearby exploration rather than trip planning.
