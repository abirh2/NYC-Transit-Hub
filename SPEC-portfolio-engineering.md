# Spec: Portfolio and Engineering Finish

## Objective

Make the repository quickly legible to engineers and recruiters, accurately document the distinctive transit pipeline, remove verified development debris, and leave reproducible quality evidence.

## Tech Stack

Markdown, existing diagrams/assets, repository scripts, Vitest, Playwright, ESLint, TypeScript, and the production Next.js build.

## Commands

- Debris scan: `rg -n "TODO|FIXME|console\\.(log|debug)|eslint-disable|@ts-ignore" app components lib tests docs README.md`
- Lint: `nvm use 24 && npm run lint`
- Typecheck: `nvm use 24 && npx tsc --noEmit`
- Tests: `nvm use 24 && npm run test`
- Build: `nvm use 24 && npm run build`
- E2E: `nvm use 24 && npm run test:e2e`

## Project Structure

- `README.md`: concise portfolio entry point
- `docs/architecture.md`: source-to-domain-to-experience pipeline and concepts
- `docs/`: setup, API, testing, demo, and accuracy material
- existing screenshot location, if found: references only; no large binaries without convention
- `tests`: critical domain/navigation behavior

## Code Style

```md
Subway positions are estimates derived from an individual realtime trip's stop
predictions projected onto static GTFS route geometry. They are not train GPS.
Bus markers use reported vehicle coordinates when Bus Time supplies them.
```

Prefer precise claims, short sections, and links to deeper documents over marketing copy.

## Testing Strategy

- Verify every command, route, version, and architecture claim against source/config.
- Extend coverage only where the critical-flow matrix has a real gap.
- Run the full quality gate and report failures honestly.
- Execute representative rider and visualization flows in the final browser pass.

## Boundaries

- Always: distinguish measured, reported, inferred, cached, and unavailable data; preserve useful docs; trace debris before removal.
- Ask first: none for accurate docs and safe cleanup. Do not add large screenshot binaries without convention.
- Never: overstate accuracy, claim unsupported offline/live behavior, delete merely-unused code without tracing it, or hide failing gates.

## Success Criteria

- README covers purpose, rider/visualization features, stack, architecture, sources, exact trip tracking, subway estimates versus bus GPS, GTFS geometry, PWA/offline behavior, setup, demo structure, and limitations.
- Architecture shows adapters → normalized transit domain → shared realtime services → rider/analytics consumers and distinguishes Station/Stop, Departure/Trip, Trip/Vehicle, geometry, caching, and freshness.
- About/README/docs make no stale version or accuracy claims.
- Completed TODOs, debug output, obsolete flags/comments, accidental raw IDs, route-color duplicates, and production fixture imports are removed only when safe.
- Critical tests cover normalization, geometry, Nearby direction/trip selection, bus selection, stale/offline data, saved stations, and deep links.
- All quality gates pass or external blockers are documented with exact evidence.

## Open Questions

No committed screenshot set was found in the initial inventory. Prefer a capture checklist and lightweight references unless an asset convention is discovered.
