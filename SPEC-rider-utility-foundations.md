# Spec: Rider Utility Foundations

## Objective

Create the shared interaction and presentation contracts that make the remaining
rider utilities feel like views of one transit product. Riders should encounter
the same search behavior, route identity, save/remove terminology, URL state,
and loading/error/empty semantics across Station Board, Plan, Accessibility,
Commute, and Service Changes.

## Tech Stack

- Next.js 16 App Router, React 19, strict TypeScript
- HeroUI 2 and Tailwind CSS 4 with existing semantic surface/state tokens
- Vitest, React Testing Library, and Playwright
- Existing normalized transit types and MTA/GTFS adapters

## Commands

- Dev: `nvm use 24 && npm run dev`
- Focused tests: `nvm use 24 && npm test -- <test paths>`
- Lint: `nvm use 24 && npm run lint`
- Typecheck: `nvm use 24 && npx tsc --noEmit`
- Full tests: `nvm use 24 && npm run test`
- Build: `nvm use 24 && npm run build`
- E2E: `nvm use 24 && npm run test:e2e -- <spec paths>`

## Project Structure

- `components/ui/`: shared search, saved-station, status, and data-state UI
- `lib/transit/`: pure rider-facing adapters and URL/query helpers
- `lib/hooks/`: existing geolocation and station preference persistence
- `types/`: shared contracts; no page-local copies of normalized transit models
- `tests/unit/`, `tests/components/`, `tests/e2e/`: deterministic behavior coverage

## Code Style

```tsx
<Link
  href={`/board?station=${encodeURIComponent(station.id)}`}
  className="min-h-11 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
>
  <SubwayBullet line={routeId} size="sm" />
  <span>{station.name}</span>
</Link>
```

- Use `@/` imports, semantic HTML, rider language, and existing design tokens.
- Prefer typed props and pure adapters; never expose raw stop IDs, trip IDs, or
  routing-engine fields as visible labels.
- Use one shared component for a repeated interaction only when its consumers
  genuinely share behavior and data contracts.

## Testing Strategy

- Unit-test query parsing/serialization and pure filtering/mapping.
- Component-test keyboard search, selection, save/remove, loading, empty, and
  unavailable states with deterministic fixtures.
- E2E-test the cross-page deep-link journeys in the initiative spec.
- Preserve exact `tripId` in links while asserting only rider-facing copy in UI.

## Boundaries

- Always: preserve station-complex `sourceIds`/platforms, exact trip identity,
  44px touch targets, visible focus, reduced-motion behavior, and honest source
  states.
- Proceed without pausing: scoped shared-component refactors and query-state
  changes covered by this initiative and its tests.
- Never: create new persistence, geolocation, route-color, polling, or outage
  fetching systems; edit generated Prisma/PWA files; expose secrets.

## Success Criteria

- Station and location search have one implementation per genuinely distinct
  contract, with keyboard navigation and clear loading/no-results/error states.
- Saved stations use the existing preference hook and the label “Saved stations.”
- Utility query state is parsed and serialized consistently and survives reloads.
- Shared status/data-state presentation uses the established semantic tokens.
- No change breaks Home, Nearby, Realtime, Reliability, or Crowding consumers.

## Open Questions

None. Assumptions are recorded in the capability map per the user's instruction
to continue without approval pauses.

