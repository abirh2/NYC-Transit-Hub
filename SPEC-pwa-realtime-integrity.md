# Spec: PWA and Realtime Integrity

## Objective

Make installation, caching, offline use, freshness, and polling intentional and truthful. Static context may remain useful offline, but no cached realtime prediction may appear current after connectivity is lost or the data exceeds its accepted age.

## Tech Stack

Next.js 16 metadata, Serwist 9, service workers, React hooks, existing route handlers, browser online/visibility APIs, Vitest, and Playwright.

## Commands

- Dev: `nvm use 24 && npm run dev`
- Focused tests: `nvm use 24 && npm run test -- tests/unit/realtime-client-payload.test.ts tests/unit/nearby-bus-realtime.test.ts tests/components/NearbySubwayServicePanel.test.tsx tests/components/StationBoard.test.tsx`
- Lint: `nvm use 24 && npm run lint`
- Typecheck: `nvm use 24 && npx tsc --noEmit`
- Build: `nvm use 24 && npm run build`

## Project Structure

- `app/sw.ts`: source of truth for runtime caching; generated `public/sw.js` is never edited
- `public/manifest.json`, `app/layout.tsx`: install/platform metadata
- `lib/transit/cache-policy.ts`: shared freshness/cache classifications
- `lib/hooks`: bounded reusable online/visibility/polling behavior
- feature components: shared freshness and unavailable-state consumers
- `app/offline`: honest offline fallback

## Code Style

```ts
export const REALTIME_PATHS = ["/api/trains/realtime", "/api/buses/realtime", "/api/alerts"] as const;

export function isRealtimePath(pathname: string) {
  return REALTIME_PATHS.some((path) => pathname.startsWith(path));
}
```

Keep cache classification pure and testable. UI freshness derives from timestamps, connectivity, and source state—not from a successful render.

## Testing Strategy

- Unit-test URL classification and freshness thresholds.
- Component-test fresh, stale, offline, partial, and unavailable states with fixed clocks.
- Build to verify Serwist injection and manifest integration.
- Browser-test offline navigation and confirm realtime UI does not preserve a valid-looking countdown.
- Inspect network activity to confirm hidden views pause polling without multiplying requests after visibility changes.

## Boundaries

- Always: separate static/slow-changing from realtime caching; preserve last usable static context; expose offline realtime unavailability; clean up timers/listeners.
- Ask first: none for corrections in this spec. Update it before background sync, push, or new install capabilities.
- Never: cache realtime indefinitely; display cached ETAs as current; edit generated service-worker output; claim unsupported native behavior; trade trip/vehicle identity for request reduction.

## Success Criteria

- Manifest identity, colors, icons, maskable icons, standalone launch, scope/start URL, viewport-fit, and applicable iOS metadata are consistent.
- Service-worker rules classify static/slow-changing and realtime endpoints separately; realtime is network-first with a short explicit maximum age.
- Offline UI says “Realtime unavailable offline” and retains only clearly described static or saved context.
- Shared freshness presentation distinguishes fresh, delayed/stale, offline, and unavailable data without over-labeling normal data.
- Primary realtime consumers pause polling while hidden and resume with one immediate refresh without duplicate intervals.
- Static geometry/metadata is not refetched on every realtime tick.
- Install/offline/reconnect behavior survives a production build and focused browser verification.

## Open Questions

None blocking. Browser inspection may reclassify endpoints based on actual response semantics.

