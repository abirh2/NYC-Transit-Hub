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
