# Spec: Analytics and Exploration

## Objective

Make Reliability, Crowding, and Service Changes coherent exploratory surfaces that share the rider product's visual language while preserving useful density. Riders and reviewers must understand what is measured, compare routes, explore changes over time, and continue into relevant realtime or rider context.

## Tech Stack

Next.js 16 App Router, React 19, strict TypeScript, HeroUI 2, Tailwind CSS 4, Recharts 3, and existing transit/API contracts.

## Commands

- Dev: `nvm use 24 && npm run dev`
- Focused tests: `nvm use 24 && npm run test -- tests/components/ReliabilitySummaryCards.test.tsx tests/components/TimeOfDayChart.test.tsx tests/components/LinePerformanceCard.test.tsx tests/components/IncidentTimeline.test.tsx tests/components/IncidentStats.test.tsx tests/lib/crowding.test.ts`
- Lint: `nvm use 24 && npm run lint`
- Typecheck: `nvm use 24 && npx tsc --noEmit`
- Build: `nvm use 24 && npm run build`

## Project Structure

- `app/reliability`, `app/crowding`, `app/incidents`: thin route shells and page orchestration
- `components/analytics`: genuinely shared chart surfaces, controls, tooltip, freshness, and empty state
- feature component folders: feature-specific presentation and shaping
- `components/ui`: product-wide metric, route, status, loading, and error primitives
- `lib/crowding`, `lib/transit`: existing calculations and domain contracts
- `tests/components`, `tests/lib`: behavior-focused coverage

## Code Style

```tsx
<ChartSurface
  title="Incidents over time"
  description="Daily incidents recorded in the selected period."
  freshness={<DataFreshness updatedAt={updatedAt} />}
>
  {points.length > 0 ? <IncidentTrend data={points} /> : <EmptyChartState />}
</ChartSurface>
```

Use named exports, `@/` imports, semantic HTML, project tokens, and explicit domain copy. Shared components own repeated presentation, not feature data shaping.

## Testing Strategy

- Unit-test metric and filter transformations.
- Component-test accessible names, state handling, keyboard controls, chart summaries, and context-preserving links.
- Use deterministic fixtures and verify 375, 393, 430, 768, and 1280 pixel layouts in the bounded browser pass.
- Do not test incidental Tailwind class lists.

## Boundaries

- Always: state exactly what a metric measures; pair color with text; provide chart context or a text summary; preserve stable route/station/trip context in links.
- Ask first: none within this accepted spec. Update it before changing metric meaning or public URL contracts.
- Never: fabricate historical performance, occupancy, passenger counts, or GPS precision; replace Recharts for aesthetics; build a generic analytics framework; present future alerts as active.

## Success Criteria

- Shared analytics primitives replace repeated surface, control, tooltip, freshness, and empty-state treatments where at least two features benefit.
- Reliability follows headline metrics → route comparison → trend → time-of-day/deeper detail and labels its score as incident-derived.
- Route comparison is keyboard-operable and routes can open contextual realtime exploration.
- Charts use theme tokens, readable axes/tooltips, concise labels, mobile-safe sizing, and accessible explanatory text.
- Crowding compactly labels estimates and explains the service-condition methodology and limitations.
- Service Changes clearly separates active, planned/upcoming, and recent/resolved events without giant cards.
- Stable incident/station context links to Realtime, Station Board, or Accessibility; missing identifiers do not create fake links.
- Loading, empty, partial, stale, and unavailable states are explicit without erasing usable data.

## Open Questions

None blocking. Where source data lacks a stable identifier, render informative text without a deep link.

