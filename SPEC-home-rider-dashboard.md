# Spec: Rider-first Home dashboard

## Objective

Redesign `/` from an equal-weight feature directory into the everyday rider
entry point for NYC Transit Hub. The first viewport must help a rider decide
what to catch next, then explain whether their usual transit is healthy, show
their saved station or commute when present, and surface only relevant service
disruptions before system-wide intelligence.

Primary user: an NYC rider checking the app one-handed while walking, waiting,
or deciding between nearby options.

Acceptance order:

1. Nearby mixed-mode departures and a clear route-planning affordance.
2. Concise service condition for routes relevant to nearby transit, favorites,
   and the saved commute.
3. Compact saved-station and saved-commute information when configured.
4. Relevant active alerts before major system-wide alerts.
5. Real reliability, incident, and crowding previews below rider information.

## Assumptions and Decisions

- Use the existing `useGeolocation` permission model. Home may automatically
  read location only when permission is already granted; it must not create a
  second store or repeatedly prompt.
- The existing local station preferences are the saved-station source of
  truth. Home shows at most the first two saved stations.
- The authenticated commute summary endpoint is the commute source of truth.
  Home does not fabricate routing, walk, or service information.
- Rider-facing route status is derived from active normalized alerts. The
  current `/api/status` endpoint describes data-feed health and must not be
  labeled as transit service status.
- Home includes subway and bus departures but no map preview. The full map
  remains on `/nearby` and `/realtime`, avoiding a heavyweight decorative map.
- Existing analytics cards may remain lower on the page because they already
  present real data rather than generic feature copy.
- Network requests are owned by one Home orchestrator and its refresh loops;
  presentational children do not fetch independently.

## Impeccable Critique Findings to Resolve

- The current first viewport has no singular rider decision and leads with a
  large empty station-setup card.
- Seven feature destinations and uniform cards create high cognitive load and
  flatten urgency.
- “System Status” conflicts with visible alerts because it means feed health,
  not route service.
- Similar cards use inconsistent click boundaries and weak heading semantics.
- On mobile, multiple independent requests create a patchwork of loading
  states before useful transit information appears.

The redesigned surface uses one primary departure panel, compact personalized
sections, semantic headings, direct exact-trip links, and quieter analytics.

## Tech Stack

- Next.js 16.3 App Router and React 19
- Strict TypeScript
- HeroUI 2 and Tailwind CSS 4 semantic tokens
- Vitest and React Testing Library
- Playwright for the Home user flow

## Commands

- Development: `nvm use 24 && npm run dev`
- Focused unit/component tests: `nvm use 24 && npm test -- tests/unit/dashboard-home.test.ts tests/components/HomeDashboard.test.tsx tests/components/NearbyDepartureRow.test.tsx`
- Lint: `nvm use 24 && npm run lint`
- Type check: `nvm use 24 && npx tsc --noEmit`
- Full test suite: `nvm use 24 && npm run test`
- Production build: `nvm use 24 && npm run build`
- Home end-to-end test: `nvm use 24 && npx playwright test tests/e2e/home.spec.ts`

## Project Structure

- `app/page.tsx` — thin server page composing the interactive Home surface
- `components/dashboard/HomeDashboard.tsx` — Home data ownership and refresh
- `components/dashboard/HomeSections.tsx` — rider-first presentational sections
- `components/nearby/NearbyDepartureRow.tsx` — shared full and compact departure row
- `lib/transit/dashboard-home.ts` — pure personalization and alert-priority logic
- `tests/unit/` — pure prioritization/status tests
- `tests/components/` — states, semantics, and exact-trip interaction tests
- `tests/e2e/home.spec.ts` — responsive Home smoke flow

## Code Style

Use normalized transit types, stable trip identity, named exports, and the
repository alias. Keep external payload hydration at the boundary:

```tsx
const relevantAlerts = prioritizeHomeAlerts({
  alerts,
  relevantRouteIds,
  relevantStopIds,
  limit: 3,
});

return services.map((service) => (
  <NearbyDepartureRow
    key={service.id}
    service={service}
    now={now}
    variant="compact"
  />
));
```

Presentation must use semantic surfaces and state tokens, visible focus, route
text in addition to color, tabular ETAs, and real headings rather than styled
paragraphs.

## Testing Strategy

- Write pure failing tests first for relevant-alert priority, route-status
  derivation, departure deduplication, and empty/unavailable behavior.
- Extend the existing departure-row component test before adding the compact
  exact-trip-link variant.
- Add Home component tests with mocked browser APIs and fetch responses for:
  geolocation available/unavailable, favorites present/absent, commute
  configured/unconfigured, relevant/no alerts, and realtime failure.
- Update the Playwright Home assertions to the rider-first hierarchy and verify
  mobile and desktop layouts in a real browser.
- Run lint, typecheck, the full test suite, production build, and focused Home
  Playwright spec before completion.

## Boundaries

- Always: reuse normalized `Departure`, `ServiceAlert`, station complexes,
  route bullets, existing persistence, and exact `tripId` deep links.
- Always: fetch all source IDs for a selected station complex and deduplicate
  departures by `tripId`.
- Always: isolate failures so missing location or one upstream feed does not
  make Home useless.
- Ask first: adding dependencies, changing database/schema, or changing auth.
  The user has explicitly waived ordinary spec review pauses, not these scope
  boundaries.
- Never: duplicate feed parsing, create a new location store, invent commute or
  reliability claims, embed the full realtime map, or edit generated files.

## Success Criteria

- The first mobile viewport contains useful realtime transit or a compact
  personalized fallback, a “Where to?”/planning affordance, and minimal chrome.
- With granted location, Home shows a mixed-mode compact preview sourced from
  the same station, bus-stop, normalized departure, and deep-link architecture
  as `/nearby`.
- Without location, saved stations and commute appear before a compact location
  retry action; the page does not become a stack of large empty cards.
- Saved station departures use normalized direction labels and exact trip links.
- Configured commute data is shown accurately; absent commute gets only a
  compact setup affordance.
- Relevant route/stop alerts outrank major unrelated disruptions, and no-alert
  states are concise.
- Service overview distinguishes good service, delays, planned work, and
  suspensions using text plus route identity.
- Analytics remain discoverable below the rider sections and show real data.
- One Home owner performs each fetch/refresh cycle; presentational children do
  not create duplicate polling.
- Keyboard, heading, focus, and screen-reader behavior meet the brief.
- Focused tests, lint, typecheck, full tests, production build, and Home E2E
  complete successfully, or any environmental blocker is reported precisely.

## Open Questions

None. The supplied product brief and the decisions above resolve implementation
choices without inventing unsupported transit behavior.
