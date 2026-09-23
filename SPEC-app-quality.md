# Spec: App-wide Quality Pass

## Objective

Remove concrete accessibility, responsive, theming, performance, safe-area, and failure-state defects across major rider and exploration routes without redesigning the product or changing transit behavior.

## Tech Stack

Existing Next.js/React UI stack, HeroUI, Tailwind tokens, Leaflet, Recharts, Vitest/Testing Library, Playwright, and Impeccable audit/polish workflows.

## Commands

- Detector: `.agents/skills/impeccable/scripts/impeccable audit`
- Lint: `nvm use 24 && npm run lint`
- Typecheck: `nvm use 24 && npx tsc --noEmit`
- Tests: `nvm use 24 && npm run test`
- Build: `nvm use 24 && npm run build`
- E2E: `nvm use 24 && npm run test:e2e`

## Project Structure

- `components/layout`, `components/ui`, `components/motion`: system corrections
- route feature folders: narrow evidence-backed fixes
- `app/globals.css`: shared theme, safe-area, Leaflet, and reduced-motion rules
- `tests/components`, `tests/e2e`: critical interaction/responsive coverage

## Code Style

```tsx
<section aria-labelledby="service-heading">
  <SectionHeader id="service-heading" title="Service now" />
  <ErrorState title="Bus data unavailable" description="Subway data is still current." />
</section>
```

Prefer semantics and shared states. Keep failure boundaries narrow so one feed cannot erase independent content.

## Testing Strategy

- Check landmarks, headings, names, keyboard behavior, focus, and non-color status cues.
- Use Playwright at 375, 393, 430, 768, 1280, and one wide desktop viewport.
- Run one bounded Impeccable evidence pass, one batched fix pass, and at most one confirmation pass.
- Inspect console errors, overflow, map/control clipping, and hidden interactive content.
- Performance changes require a concrete mechanism, not speculative memoization.

## Boundaries

- Always: preserve rider task order and exact identity; meet 44px targets; respect safe areas/reduced motion; use theme tokens; isolate partial failures; verify both themes.
- Ask first: none for high-confidence fixes within this spec. Update it before navigation or data-contract changes.
- Never: hide failures, remove useful detail for a score, add decorative motion/chartjunk, or perform a broad rewrite.

## Success Criteria

- Major routes have one logical page heading, correct landmarks, labeled controls, visible focus, and no keyboard traps.
- Charts include explanatory text and maps expose usable labeled controls; realtime announcements do not overwhelm screen readers.
- Fixed/floating surfaces and fullscreen map/sheet controls clear safe areas.
- Supported viewports have no blocking overflow, clipped controls, nav overlap, or unreadably compressed charts.
- Dark/light modes preserve contrast, selected states, borders, map readability, and route identity.
- Loading, empty, partial, offline, and error states are consistent; raw exceptions/JSON never become page content.
- Map updates preserve vehicle identity and avoid unnecessary remounts/geometry recomputation.
- Chart/map code loads only on routes that need it, using lazy loading where material.

## Open Questions

None blocking. Live-feed-only states that cannot be reproduced deterministically will be documented.

