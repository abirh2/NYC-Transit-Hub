# NYC Transit Hub Capacitor/iOS Audit

Initial architecture audit: 2026-09-23
Native project readiness audit: 2026-09-25

Scope: repository, generated iOS project, production/native build configuration, native plugins, assets, privacy declarations, release guardrails, and production-site regression baseline. Apple account enrollment, signing-team selection, physical-device testing, App Store Connect, and signed distribution were not performed.

> Implementation update (2026-09-23): the production architecture recommended
> by this audit is now implemented. A sibling Vite/React graph under `native/`
> emits bundled assets to `capacitor-web/`; shared UI requests use
> `lib/api/client.ts`; public read APIs have exact-origin native CORS handling;
> Serwist is omitted from the native output; native crowding loads from the
> hosted API; and `npm run ios:build` builds, verifies, and syncs without
> `server.url`. Native authentication/Commute remains intentionally withheld,
> and physical-device capability validation remains outstanding. See
> [`IOS_BUILD.md`](./IOS_BUILD.md) for the current commands and configuration.

## Current native-project readiness

The original architecture sections below explain why NYC Transit Hub uses a separate bundled Vite frontend. The following table is the authoritative audit of the generated Capacitor 8.5.2 iOS project now checked into `ios/`.

| Concern | Current repository state | Readiness |
|---|---|---|
| Display name | `NYC Transit Hub` in Capacitor config and `CFBundleDisplayName` | Ready |
| Bundle identifier | `com.abirhossain.nyctransithub` in Capacitor and both Xcode configurations | Ready, subject to availability in the owner's Apple team |
| Deployment target | iOS 15.0 in project/target settings, CapApp-SPM, Capacitor iOS, and every installed plugin | Ready; this is the lowest dependency-supported target and retains older iPhones |
| Version/build | `MARKETING_VERSION = 1.0`, `CURRENT_PROJECT_VERSION = 1`; `Info.plist` references those settings | Ready for development; increment in Xcode before each uploaded build |
| Signing | Automatic signing; no `DEVELOPMENT_TEAM` or provisioning profile is committed | Prepared; team selection remains manual |
| Permissions | Foreground location only in application code; both location strings required by the current Geolocation plugin are present and user-facing | Prepared; prompt/denial must be verified on device |
| Privacy manifest | App manifest declares Preferences/UserDefaults reason `CA92.1`; Capacitor core packages provide their own manifests | Ready for current plugin set; App Store answers remain manual |
| Orientations | iPhone portrait + both landscapes; iPad all four orientations | Configured; rotate/map/sheet behavior needs device testing |
| Status bar | Does not overlay WebView; light/dark style is synchronized by the native adapter | Configured; visual validation remains manual |
| Launch screen | Project-specific transit launch artwork, manual hide after React commit, 200 ms fade | Development-ready; owner must approve final branding/layout |
| App icon | 1024×1024 opaque image exists, but it is the default Capacitor logo | **Not App Store-ready; replacement artwork is required** |
| Plugins | App, Browser, Geolocation, Haptics, Keyboard, Network, Preferences, SplashScreen, and StatusBar are integrated through SPM | Ready for build; device behavior remains unverified |
| Capabilities | No entitlements file; no push, background modes, associated domains, or other unused capability | Correct for current implementation |
| ATS | Only `NSAllowsLocalNetworking` is enabled for explicit LAN development; arbitrary loads are not allowed | Acceptable for development; can be removed if LAN HTTP mode is retired |
| Release safety | HTTPS public origin validation, bundle scan, console/debug stripping, cleared remote-server environment, and an Xcode Release build phase rejecting `server.url`/local URLs | Ready |

### Asset finding

Xcode's single-size app-icon catalog accepts one 1024×1024 iOS source image and generates device variants. The committed image has no alpha, but it is Capacitor placeholder artwork. Supply an approved 1024×1024 sRGB PNG with an opaque background, square corners, no baked-in corner mask, and safe detail at small sizes; replace `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` without changing the catalog filename. App Store listing screenshots and promotional artwork are separate App Store Connect assets.

The Splash catalog contains 2732×2732 1×/2×/3× entries generated from `ios/App/Branding/splash-source.svg`. They are useful for development and already wired to `LaunchScreen.storyboard`, but final visual approval on real devices is still required.

### Concrete App Store review risks

- The placeholder app icon blocks credible App Store submission.
- Physical-device behavior remains unverified for permission prompts, safe areas, keyboard resizing, maps/tiles, VoiceOver, rotation, offline recovery, and background/resume.
- CARTO and Esri mobile-app terms, attribution, quotas, and privacy implications require owner review.
- Native auth/Commute is deliberately hidden rather than partially implemented; it is not a dead-end route in native navigation.
- The bundled shell and native adapters provide substantial functionality beyond a remote website wrapper, but review should demonstrate the rider flows in [`IOS_RELEASE_CHECKLIST.md`](./IOS_RELEASE_CHECKLIST.md).
- No payment flow, push notification, background mode, associated domain, analytics SDK, or debug screen was found in the native route graph.

See [`IOS_PRIVACY_NOTES.md`](./IOS_PRIVACY_NOTES.md) for the factual data-flow inventory and [`IOS_RELEASE_CHECKLIST.md`](./IOS_RELEASE_CHECKLIST.md) for remaining device, signing, and distribution work.

## 1. Executive Summary

The NYC Transit Hub user interface can be bundled for iOS, but the repository cannot safely become a Capacitor asset bundle by merely adding `output: "export"` to the existing Next.js configuration. The recommended conclusion is **C: a separate native build configuration/target is required**.

The durable architecture is:

```text
shared UI, hooks, types, and transit presentation
              /                         \
  existing Next.js web app       native static frontend
       (Vercel)                  (Capacitor WKWebView)
              \                         /
             hosted Vercel HTTP APIs
                         |
             MTA / GTFS / DB / OTP services
```

The current UI route set is unusually favorable for bundling: there are no filesystem dynamic page routes, and every user-facing page already builds as static HTML except that `/crowding` obtains server data during prerendering and uses ISR. Most pages are thin Server Component shells around Client Components; those static shells are compatible with export in principle. Realtime train and bus selections already use query parameters on `/realtime`, avoiding unbounded `[tripId]` or `[vehicleId]` paths.

The current deployment is nevertheless a full server application. It contains 28 route handlers, global Supabase session middleware, an auth callback, Prisma/PostgreSQL access, filesystem-backed GTFS parsing, server-side MTA and OTP calls, server cookies, ISR, default Next image optimization, and a Serwist service worker. `npm run build` creates a `.next` server deployment, not a directory containing a standalone `index.html` suitable for Capacitor.

Before a production iOS bundle, the project needs:

1. A separate native frontend build target whose output directory contains `index.html` and all local assets.
2. A centralized HTTP client with an environment-specific Vercel API base URL.
3. Explicit CORS handling for the native origin on the public API surface.
4. A deliberate native authentication/session design, or auth/commute features withheld from the first native milestone.
5. A browser/Capacitor geolocation adapter and durable native-aware preference storage.
6. Service-worker generation and registration disabled for the native build.
7. Asset, image, routing, deep-link, map, safe-area, and physical-device validation.

All MTA credentials, database access, feed ingestion, route planning, authenticated commute persistence, server cookies, and Supabase service-side behavior must remain on Vercel. The existing web/PWA behavior should remain intact while native support is added alongside it.

## 2. Current Application Architecture

### Framework and tooling

| Concern | Current state | Evidence / consequence |
|---|---|---|
| Framework | Next.js 16.3.5, App Router | `package.json`, `package-lock.json`, `app/`; this version has export behavior that must be checked against its bundled docs rather than older Next assumptions. |
| UI runtime | React 19.2.0 | `package.json`, `package-lock.json` |
| Language | Strict TypeScript, target ES2017, no emit | `tsconfig.json`; `moduleResolution: "bundler"`, root alias `@/*`. |
| Styling | Tailwind CSS 4 through `@tailwindcss/postcss`, HeroUI 2, global CSS variables | `postcss.config.mjs`, `app/globals.css`, `app/providers.tsx` |
| Charts/maps | Recharts and Leaflet/React Leaflet | Maps are dynamically loaded client-only to avoid Leaflet's `window` dependency. |
| Package manager | npm, lockfile version 2 | `package-lock.json`; use `npm ci` for reproducible CI/native builds. |
| Deployment | Next server output on Vercel | `vercel.json` has only the schema declaration; no custom rewrites, redirects, or headers. |
| Database/auth | Prisma 7 + PostgreSQL/Supabase, Supabase Auth | Server route handlers and middleware; not bundleable. |
| PWA | Serwist 9.2.3 | `next.config.ts`, `app/sw.ts`, `public/manifest.json`; generated `public/sw.js` is ignored/generated. |

`app/layout.tsx` is the root Server Component. It defines metadata and `viewportFit: "cover"`, loads Geist and Geist Mono with `next/font/google`, and renders `Providers` and `AppShell`. `AppShell` is client-side because it owns the mobile “More” drawer state. It composes the sticky `Navbar`, desktop `Sidebar`, fixed mobile `BottomNav`, and route content.

### Data boundaries

- Client pages and components call relative `/api/...` URLs.
- Next route handlers call MTA feeds, OTP, Nominatim, Prisma/PostgreSQL, and static GTFS utilities.
- Static GTFS-derived data is stored under `data/gtfs/`. Some files are compiled into JavaScript through imports; subway geometry is fetched at runtime from `/data/gtfs/subway-geometry/{route}.json` by `loadSubwayRouteGeometry()` in `lib/gtfs/subway-route-geometry.ts`.
- `lib/gtfs/parser.ts` uses `node:fs`, `node:path`, and `process.cwd()` and must remain server-only.
- `lib/supabase/server.ts` and `middleware.ts` use request cookies and belong only to the web/server deployment.
- No server actions (`"use server"`) were found.

### Static assets and images

Public icons, the manifest, and other public files live in `public/`. `components/ui/SubwayBullet.tsx` is the only `next/image` caller found. It renders root-relative `/icons/subway/*.svg` resources using the default Next image pipeline. A static native target must either set an export-compatible image loader/use `unoptimized`, or replace this one use with a plain static image strategy. Root-relative asset URLs must be verified under the chosen Capacitor scheme and output layout.

## 3. Live Website Findings

The production site at `https://nyctransithub.vercel.app/` was inspected in a mobile viewport of 390 × 844 pixels. The following flows were exercised without granting location permission:

- Home
- Nearby
- Realtime map and subway detail
- Realtime bus route and vehicle detail
- Plan (`/routes`)
- Station Board (`/board`)
- Accessibility
- Reliability
- Crowding
- Incidents

Observed production behavior:

- The fixed five-item bottom navigation (Home, Nearby, Map, Plan, More) remained reachable and visually clear. The sticky header and content spacing respected the mobile layout.
- Nearby loaded its search/map layout, and its location control progressed through initialization without forcing a browser permission prompt.
- The Realtime Leaflet map loaded CARTO tiles. Subway detail and bus detail appeared as a bottom sheet over the map. The dense map/detail/attribution area is usable but needs physical-iPhone testing around the home indicator and sheet overlap.
- Realtime selection is encoded as query state, for example `/realtime?mode=subway&route=1&direction=southbound&trip=...&view=map`; bus selection follows the same pattern. Browser back/forward can therefore preserve a selection without generating route paths.
- The bus selector contains a very large grouped route list, but includes search. This should be tested for keyboard behavior and scrolling in WKWebView.
- Plan inputs, Board tabs, Accessibility filters, Reliability charts, Crowding, and Incidents all loaded at phone width. Board's four modal tabs wrap but remain usable.
- One minified React hydration error (`#418`) appeared in an accumulated console after a long sequence of client-side navigations. Fresh direct loads of the implicated analytics pages did not reproduce it. Treat this as an observation to retest, not a proven Capacitor blocker.

The production site remains the behavioral reference. Native work should preserve its route names, selection semantics, responsive composition, accessibility, and realtime freshness unless a native-specific change is intentional.

## 4. Current Build Pipeline

`package.json` defines:

```text
npm run dev       -> next dev
npm run build     -> next build --webpack
npm run start     -> next start
npm run lint      -> eslint
npm run test      -> vitest run
npm run test:e2e  -> playwright test
```

`next.config.ts` wraps Next with Serwist, using `app/sw.ts` as the source and `public/sw.js` as the generated destination. Serwist is disabled only when `NODE_ENV === "development"`. The configuration also enables the React Compiler and has no `output`, `assetPrefix`, `basePath`, redirects, or rewrites.

The audit build used the workspace runtime Node v24.19.0 because the default shell exposes Node v16.11.1 and no `nvm` command. Node 16 is unsupported for this project and for current Capacitor. The production build succeeded and:

- compiled a Next server application;
- prerendered all 12 user-facing routes;
- compiled all route handlers, middleware, and the auth callback for server execution;
- emitted HTML/RSC/server manifests under `.next/`;
- emitted client chunks under `.next/static/`;
- generated `public/sw.js` through Serwist;
- did **not** emit an `out/index.html` or other Capacitor-ready web directory.

During prerendering, `/crowding` attempted live MTA DNS/network access and logged `ENOTFOUND` errors in the restricted environment. The page handles the failure and the build still completed. This reveals undesirable build-time coupling to a live external feed even though it is not currently a build failure.

The route table marked every UI page as static (`○`); `/crowding` was emitted with revalidation/ISR. Every `/api/*` handler and `/auth/callback` was dynamic (`ƒ`). Next also warned that the `middleware` convention is deprecated in favor of `proxy`, and Node warned about the module type of `app/hero.ts`. Serwist reported a 3.02 MB chunk above its default precache size. These are existing web-build warnings, not reasons to install Capacitor now.

## 5. Route Compatibility Matrix

Legend: **A** static/client compatible; **B** requires server functionality; **C** dynamically rendered; **D** route params complicate export; **E** uses a Server Component; **F** depends on `/api/*`; **G** requires further validation.

| URL | Source | Classification | Native-bundle finding |
|---|---|---:|---|
| `/` | `app/page.tsx`, `components/dashboard/HomeDashboard.tsx` | A, E, F | Static shell is exportable; client dashboard needs an absolute/configurable API client and geolocation adapter. |
| `/about` | `app/about/page.tsx` | A | Client page with external links; open external destinations through a deliberate Browser policy. |
| `/accessibility` | `app/accessibility/page.tsx`, `app/accessibility/AccessibilityClient.tsx` | A, E, F | Static metadata/Suspense shell; client calls elevator APIs. |
| `/board` | `app/board/page.tsx` | A, F | Client page; search, favorites, rail, bus, and subway boards rely on hosted APIs. |
| `/commute` | `app/commute/page.tsx`, `app/commute/CommuteClient.tsx` | A, E, F, G | UI can bundle, but authenticated cookie/session behavior is not native-ready. |
| `/crowding` | `app/crowding/page.tsx` | B, C, E, F | The page Server Component calls `getNetworkCrowding()` at build/request time and declares revalidation. Native version must be a client shell that calls hosted `/api/metrics/crowding`. |
| `/incidents` | `app/incidents/page.tsx`, `app/incidents/IncidentsClient.tsx` | A, E, F | Static shell; client calls hosted incidents API. |
| `/nearby` | `app/nearby/page.tsx`, `app/nearby/NearbyClient.tsx` | A, E, F | Static shell; needs API base, geolocation adapter, bundled geometry/assets, and map/device testing. |
| `/offline` | `app/offline/page.tsx` | A, G | Browser online/reload page. Native should use explicit Network state and not depend on SW navigation fallback. |
| `/realtime` | `app/realtime/page.tsx`, `app/realtime/RealtimeClient.tsx` | A, E, F | Static shell. Query-state subway/bus/rail detail is bundle-friendly. Map and APIs need native adaptations described below. |
| `/reliability` | `app/reliability/page.tsx`, `app/reliability/ReliabilityClient.tsx` | A, E, F | Static shell; client calls hosted reliability API. |
| `/routes` | `app/routes/page.tsx`, `app/routes/RoutesClient.tsx` | A, E, F | This is the production “Plan” route. Client route finder calls hosted OTP proxy. There is no `/plan` route. |
| Train detail | Query state on `/realtime` | A, F | No filesystem route; arbitrary trip IDs do not require generation. |
| Bus detail | Query state on `/realtime` | A, F | No filesystem route; arbitrary vehicle IDs do not require generation. |

No page directories with `[param]`, `[...catchAll]`, or optional catch-all segments were found. Therefore classification D does not currently apply to any user-facing route.

All route handlers under `app/api/**/route.ts` and `app/auth/callback/route.ts` are B/C and must remain in the Vercel deployment. They must not be copied into or simulated inside the iOS bundle.

## 6. Server / Client Boundary Findings

### Safe static Server Components

The Server Components in `app/page.tsx`, `app/accessibility/page.tsx`, `app/commute/page.tsx`, `app/incidents/page.tsx`, `app/nearby/page.tsx`, `app/realtime/page.tsx`, `app/reliability/page.tsx`, and `app/routes/page.tsx` primarily provide metadata, layout, and Suspense boundaries before rendering a Client Component. Static export can execute these at build time. They do not by themselves require a native rewrite, although a separate target may choose client-only entry points to avoid importing server concerns.

### Must change for the native target

- `app/crowding/page.tsx` performs server data loading and ISR. The native equivalent should render a static/client page and fetch the hosted endpoint after launch.
- `components/auth/AuthModal.tsx` builds email redirect URLs from `window.location.origin`. In Capacitor that would be `capacitor://localhost`, which is not a complete auth/deep-link design.
- Every relative frontend API request must resolve through a shared client configured with the Vercel origin in native production.
- `components/ui/SubwayBullet.tsx` must avoid the default Next image optimizer in a static target.

### Must remain server-side

- All `app/api/**/route.ts` handlers.
- `app/auth/callback/route.ts` until/unless a purpose-built native auth callback replaces it.
- `middleware.ts` and `lib/supabase/server.ts`, including cookie refresh.
- Prisma and PostgreSQL code, `lib/db.ts`, generated Prisma client use, and database writes.
- `lib/gtfs/parser.ts` filesystem access.
- MTA/OTP/Nominatim proxy calls and feed parsing where credentials, CORS, rate limiting, or response normalization require a trusted backend.
- Ingestion handlers under `app/api/ingest/**`.

No Server Actions or `headers()` calls were found in the user-facing route path. `cookies()` is confined to the Supabase server/auth path. Dynamic flags and revalidation declarations are concentrated in route handlers and the crowding page.

## 7. API Dependency Matrix

All listed frontend requests currently use relative URLs and therefore assume that the page and API share an origin. No repository-wide API client or base-URL abstraction exists; helpers such as `requestData` in `components/dashboard/HomeDashboard.tsx` are local only.

| Frontend caller | Current endpoint | Purpose | Native risk |
|---|---|---|---|
| `HomeDashboard`, `AlertsCard` | `/api/alerts` | Active service alerts | Same-origin/CORS; normalize failures centrally. |
| `HomeDashboard`, `StationBoard`, `StationCard`, `RealtimeClient`, `LiveTrackerCard`, `NearbyClient` | `/api/trains/realtime` | Subway arrivals/trips | Same-origin/CORS; realtime timeout and cache policy must survive absolute URLs. |
| `HomeDashboard`, `StationSearch`, `NearbyStations`, `NearbyClient` | `/api/stations` | Station search/nearby | Same-origin/CORS. |
| `HomeDashboard`, `NearbyClient` | `/api/buses/stops`, `/api/buses/nearby` | Nearby bus stops/vehicles | Same-origin/CORS; geolocation query parameters. |
| `RealtimeClient`, `LiveTrackerCard` | `/api/buses/routes`, `/api/buses/realtime` | Bus route catalog and vehicles | Same-origin/CORS; large list and live polling. |
| `RailStationSearch` | `/api/lirr/stations`, `/api/metro-north/stations` | Rail station search | Same-origin/CORS. |
| `RailStationBoard`, `RealtimeClient`, `LiveTrackerCard` | `/api/lirr/realtime`, `/api/metro-north/realtime` | Rail arrivals/trips | Same-origin/CORS and polling. |
| `AccessibilityClient`, `StationAccessibilityStatus` | `/api/elevators`, `/api/elevators/upcoming` | Current/upcoming elevator outages | Same-origin/CORS. |
| `IncidentsClient`, `IncidentsCard` | `/api/incidents` | Incident list | Same-origin/CORS. |
| `ReliabilityClient`, `ReliabilityCard` | `/api/reliability` | Reliability analytics | Same-origin/CORS. |
| `CrowdingList`, `CrowdingCard`; native replacement for crowding page | `/api/metrics/crowding` | Network crowding | Same-origin/CORS; remove page's build-time server call for native. |
| `SystemStatusCard` | `/api/status` | Aggregate system status | Same-origin/CORS. |
| `RouteFinder` | `/api/routes/trip` | OTP trip planning proxy | Same-origin/CORS; keep OTP URL/server details off client. |
| Route UI | `/api/routes`, `/api/routes/accessible` | Route metadata/accessibility | Same-origin/CORS. |
| `LocationSearchField` | `/api/locations` | Server-side Nominatim search proxy | Same-origin/CORS; keep user agent/rate controls server-side. |
| `CommuteSetup`, `CommuteClient` | `/api/commute/settings` (GET/POST/DELETE) | Persist commute settings | Cross-origin auth/session and credential policy are unresolved. |
| `CommuteSummary`, `CommuteCard`, `HomeDashboard` | `/api/commute/summary` | Personalized commute summary | Cross-origin auth/session and credential policy are unresolved. |

Server-only endpoints with no normal native UI caller include `app/api/ingest/{alerts,buses,elevators,reliability,subway}/route.ts`. These must not be made broadly CORS-accessible. Audit and require server-to-server authorization before relying on them in production operations.

Recommended API abstraction:

- Introduce a small typed `apiFetch(path, options)`/service layer in shared client code.
- In web development and production, use same-origin URLs by default.
- In iOS development, use a configurable HTTPS development backend (or Vercel preview) while the frontend is served locally/live-reloaded.
- In iOS production, use the canonical HTTPS Vercel API origin.
- Centralize URL joining, timeouts, JSON/error normalization, credentials/auth headers, request IDs, and cache intent.
- Keep endpoint-specific validation/types near existing domain modules; do not turn the client into an untyped catch-all.

## 8. Static/Bundled Build Feasibility

The correct finding is **C: a separate native build configuration/target is required**.

Next 16 static export can execute build-time Server Components and emit an `out` directory, so static shells are not inherently a blocker. The existing application as a whole uses features documented as unsupported by static export:

- request-dependent route handlers and all server APIs;
- middleware/proxy behavior;
- cookies and the Supabase auth callback;
- ISR/revalidation on `/crowding`;
- the default `next/image` loader;
- server-side feed/database/filesystem modules;
- runtime API behavior expected from the Vercel deployment.

The relevant Next documentation is shipped in `node_modules/next/dist/docs/01-app/03-api-reference/config/next-config-js/output.mdx` and `node_modules/next/dist/docs/01-app/03-building-your-application/10-deploying/02-static-exports.mdx`. It states that export emits `out`, while cookies, proxy, ISR, request-dependent handlers, default image optimization, and other server features are unsupported.

Do not toggle `output: "export"` in the existing `next.config.ts`. That risks breaking the working Vercel web/backend target and forces mutually incompatible concerns into one graph. Create a sibling native frontend target or an explicit native-only app/configuration that:

- includes only user-facing pages and shared browser-safe modules;
- emits a deterministic web asset directory with `index.html`;
- never imports route handlers, middleware, Prisma, Node filesystem code, or secrets;
- points its client to hosted APIs;
- disables Serwist for native;
- uses export-compatible assets/images and routing;
- can be validated independently before `npx cap sync` ever runs.

A separate lightweight Vite/React shell is also technically viable, but it would duplicate routing/layout conventions. Prefer a separate Next static frontend target if shared component reuse stays clean; choose another bundler only if Next's native-only exclusions become fragile. The key boundary is separate build graphs, not a specific folder name.

## 9. Dynamic Route Concerns

There are no dynamic filesystem page routes. Train and bus details live inside `/realtime` and are selected with `mode`, `route`, `direction`, `trip`, and `view` query parameters. This is the right shape for arbitrary realtime identifiers because a bundled build needs only one `/realtime` document.

Preserve that model. Do not introduce `/train/[tripId]` or `/bus/[vehicleId]` unless the native target supplies a catch-all/fallback router and a deliberate deep-link translation. Existing tests such as `tests/unit/realtime-deep-link.test.ts` and rider query-state tests should become part of the native routing contract.

Potential issues are not route generation but lifecycle and restoration: a trip can expire between app suspension and resume, a deep link can contain a stale ID, and cached data can no longer contain the selected vehicle. The detail UI should fall back to route-level state with a clear message rather than a blank screen.

## 10. Geolocation

`lib/hooks/useGeolocation.ts` is the shared browser hook. It uses `navigator.permissions.query({ name: "geolocation" })` where available and `navigator.geolocation.getCurrentPosition()`. Defaults are `enableHighAccuracy: false`, `maximumAge: 60_000`, and `timeout: 10_000`. It performs one-shot reads; its `watchId` cleanup scaffolding is currently unused.

Consumers include:

- `components/dashboard/HomeDashboard.tsx` — automatic request only when permission is already granted.
- `app/nearby/NearbyClient.tsx` — same auto-request behavior plus user-triggered location actions.
- `app/realtime/RealtimeClient.tsx` — user-triggered location/map behavior.
- station and bus board components — independent manual location requests.

There is no application-wide location service, subscription, or shared persisted location cache. Multiple hook instances independently query permission and maintain state. The hook correctly avoids automatically prompting when permission is merely `prompt`, reducing surprise permission requests.

Adapter difficulty is **moderate**, not high. Preserve one UI-facing location interface and inject:

- a web provider using the current browser APIs;
- an iOS provider using Capacitor Geolocation permission and position APIs;
- normalized permission (`prompt/granted/denied/restricted`), coordinate, accuracy, timestamp, and error types;
- optional shared in-memory caching and app-resume refresh policy.

The native project will later need the appropriate `NSLocationWhenInUseUsageDescription`. Request permission at a user-understandable moment. Do not request background location; no audited feature requires it.

## 11. Storage

| Data | Current mechanism | Native recommendation |
|---|---|---|
| Favorite stations/routes | `localStorage` key `nyc-transit-favorites` in `lib/hooks/useStationPreferences.ts` | Move behind a small storage interface; use Capacitor Preferences for durable small key/value data. |
| Theme | `next-themes`, local browser storage (`nyc-transit-theme`) via `app/providers.tsx` | Native-aware preference storage is useful but can follow favorites; preserve system-theme behavior. |
| Sidebar collapsed state | `localStorage` in `components/layout/Sidebar.tsx` | Desktop-web-only convenience; it need not be migrated to iOS. |
| Commute settings | Supabase/PostgreSQL through `/api/commute/settings` | Keep server-backed; native auth must be solved first. |
| Supabase session | Browser Supabase client plus web cookies/middleware | Needs a deliberate supported native token/session strategy. Do not copy server cookies or store privileged secrets. |
| Realtime/offline responses | Service Worker Cache Storage | Do not carry this cache unchanged into native; define explicit cache/freshness rules if offline data is later added. |

No direct use of `sessionStorage` or IndexedDB was found. Capacitor's storage guidance warns that `localStorage` and IndexedDB in mobile web views can be reclaimed by the OS; they are not the right durability guarantee for favorites. Preferences is appropriate for small settings, not large feed caches or secrets.

Safari/PWA storage is not automatically shared with a separately installed App Store WKWebView, so migrating an existing website user's browser favorites is generally impossible without account synchronization. A one-time localStorage-to-Preferences migration matters only if an early native beta ships with localStorage and is later upgraded.

## 12. Service Worker / PWA

`app/sw.ts` uses Serwist precaching plus:

- `NetworkFirst` for realtime paths with a five-second timeout and roughly 45-second expiry;
- `NetworkFirst` for slower-changing transit data with an eight-second timeout and roughly five-minute expiry;
- `StaleWhileRevalidate` for static transit data with a 24-hour expiry;
- `NetworkOnly` for unmatched API/MTA traffic;
- `/offline` as the offline navigation fallback;
- `skipWaiting`, `clientsClaim`, and navigation preload.

This is a reasonable web PWA design, but the service worker should be **disabled and omitted from the native build**. Bundled application assets are already local. A second caching/navigation layer in WKWebView adds little value, can retain stale realtime responses, complicates debugging and upgrades, and may not register consistently under a custom scheme. Native online/offline state should use the Network adapter, and any future offline feed cache should be explicit, timestamped, bounded, and tested independently.

Keep the current service worker and manifest for the Vercel web/PWA target. Add a native build flag that prevents both Serwist generation/injection and registration. Native `/offline` behavior should become a normal UI state instead of a service-worker navigation fallback.

## 13. Maps

`components/realtime/map/RealtimeMap.tsx` dynamically loads `RealtimeMapCanvas.tsx` with `ssr: false`; `components/nearby/NearbyMap.tsx` does the same for `NearbyMapCanvas.tsx`. This is the correct boundary for Leaflet, which touches browser globals.

Current external tiles:

- Realtime: CARTO HTTPS tiles.
- Nearby: Esri HTTPS tiles.

Native risks and required checks:

- Confirm both vendors allow the intended App Store use, attribution display, request volume, and any planned offline behavior. Do not cache tiles without permission.
- Verify tile image CORS and Content Security Policy behavior from `capacitor://localhost` on a physical device. HTTPS satisfies normal App Transport Security expectations.
- Preserve visible attribution when the detail sheet is open; the live phone audit showed a dense bottom area.
- Call/retain Leaflet resize invalidation when the app resumes, rotates, changes safe area, or a sheet changes the map viewport.
- Test one-finger page scrolling versus map panning, pinch zoom, sheet dragging, and VoiceOver focus.
- Ensure subway geometry JSON from `/data/gtfs/subway-geometry/*.json` is copied into the bundle or fetched from an explicit hosted static/API origin. Root-relative paths must not silently target the wrong origin.
- Bus route/station data imported from `data/gtfs` becomes bundle code/data and may affect binary size; measure native bundle size before duplicating large artifacts.
- Leaflet `divIcon` markers use generated HTML/CSS and avoid a default marker-path dependency, but route bullets still depend on `/icons/subway/*.svg`.
- Revalidate map height after the keyboard, status bar, home indicator, and Dynamic Island are present. Keep Leaflet; there is no evidence justifying a native map rewrite.

## 14. CORS / External Resources

The current API assumes same-origin web calls. No `Access-Control-Allow-Origin` headers, shared CORS utility, or `OPTIONS` route handling were found.

Production Capacitor defaults commonly produce the origin `capacitor://localhost`; live-reload/development can use a configured HTTP(S) origin. Exact origin behavior must be confirmed in the generated iOS project and reflected in an allowlist. Public read endpoints used by the matrices above will need:

- exact allowed origin matching, not an unconditional wildcard policy;
- `GET`, `HEAD`, and `OPTIONS` where applicable;
- allowed request headers used by the centralized client;
- `Vary: Origin` on origin-varying responses;
- consistent handling for errors as well as successful responses.

Authenticated commute endpoints need a separate decision. A wildcard origin cannot be combined safely with credentials. Prefer an explicit bearer-token design validated by the server rather than attempting to reuse Vercel's browser cookies cross-origin. Limit CORS to the endpoint methods the native UI actually uses.

Do **not** allow the native origin on `app/api/ingest/**` merely for convenience. Those endpoints are operational/server-to-server surfaces and should have explicit authorization independent of CORS.

External resources and their boundary:

| Resource | Where used | Boundary/risk |
|---|---|---|
| CARTO/Esri tile servers | Leaflet canvases | Direct browser image requests; physical-device/CORS/terms validation. |
| Supabase URL and anon key | `lib/supabase/client.ts` | Direct client service; values are public by design, but RLS/auth redirects must be correct. |
| MTA feeds and API key | `lib/mta/**`, route handlers | Server only; never call credentialed feeds from native. |
| Nominatim | `/api/locations` | Server proxy only; preserve provider usage policy. |
| OTP | `/api/routes/trip` | Server proxy only. |
| Geist fonts | `next/font/google` in `app/layout.tsx` | Build-time/localized by Next; verify fonts are present in native output and no runtime Google request is required. |
| GitHub/MTA/Next/HeroUI links | About page | Open through the system/in-app Browser policy rather than navigating the app WebView away. |

No analytics SDK or remote image host was found in the audited frontend.

## 15. Routing / Deep Linking

Next `Link`, `useRouter`, `usePathname`, and `useSearchParams` are suitable inside a bundled SPA/static frontend if every route document is included and the WKWebView serves navigation consistently. Validate direct entry to each route, browser back, query changes, app suspension/resume, and cold starts.

The production bundle must not rely on a remote server to rewrite arbitrary paths to `index.html`. Choose one documented strategy:

- emit a static HTML document for every finite route and ensure Capacitor can resolve it; or
- use an SPA router/hash/fallback design in the native-only target.

Keep public web URLs and native route state aligned. Use the Capacitor App plugin to receive Universal Links/custom scheme events and translate them into internal router navigation. A link containing an expired realtime trip should still open `/realtime` and degrade to the containing route/mode.

`components/auth/AuthModal.tsx` currently uses `window.location.origin` for email confirmation. Replace that behavior only after the app's associated domains, Supabase redirect allowlist, Universal Link/custom URL callback, and session exchange are designed together. External pages should use the Browser plugin; internal links should stay in the app router.

## 16. Browser API Compatibility

| API/pattern | Representative files | Classification |
|---|---|---|
| `window`, `document`, timers, DOM events | search fields, rail search, maps, `HomeDashboard`, `NearbyClient` | Standard WKWebView behavior; retain client-only/SSR guards and cleanups. |
| `navigator.geolocation` / Permissions API | `lib/hooks/useGeolocation.ts` | Add Capacitor adapter; Permissions API behavior varies in WKWebView. |
| `navigator.onLine`, online/offline and visibility events | `lib/hooks/useVisiblePolling.ts`, `app/offline/page.tsx` | Safe as a hint, but use Capacitor Network/App lifecycle for authoritative native behavior and resume refresh. |
| `localStorage` and `storage` event | `useStationPreferences`, `Sidebar`, theme provider | Works but not durable enough for important native preferences; abstract it. Cross-window storage events have limited value in a single WebView. |
| `window.location.origin` | `components/auth/AuthModal.tsx` | Unsafe assumption for auth callbacks; native deep-link design required. |
| `window.location.reload()` | `app/offline/page.tsx` | Technically works; replace SW-dependent offline recovery in native UX. |
| `getComputedStyle`, Leaflet DOM access | map canvas components | Safe because canvases are client-only; device testing required. |
| Service Worker / Cache Storage | Serwist-generated registration and `app/sw.ts` | Disable in native target. |
| `matchMedia` | theme/motion libraries | Supported in WKWebView; validate reduced motion and dark mode. |

No application use of Notification, clipboard, Web Share, or vibration APIs was found. Therefore there is nothing to shim for the first build.

## 17. Native Capability Opportunities

Priority order:

1. **Geolocation** — required to make Home/Nearby/Realtime location behavior reliable and permission-aware.
2. **App** — required for deep links, resume events, and refreshing stale realtime data after suspension.
3. **Network** — improves offline state and polling decisions beyond `navigator.onLine`.
4. **Preferences** — durable favorites and theme/settings storage.
5. **StatusBar** — coordinate theme, contrast, overlays, and safe areas.
6. **SplashScreen** — replace the blank WebView startup with controlled branded startup once load timing is measured.
7. **Browser** — keep external sites and auth pages from replacing internal WebView navigation.

Useful but deferrable:

- **Haptics** for deliberate selection/confirmation moments, respecting reduced-motion/accessibility preferences. It is polish, not infrastructure.
- **Share** for sharing a station, route, incident, or deep link after Universal Links exist. There is no current share feature to preserve.

Do not install plugins until the native target and interface boundaries exist. Add only plugins used by implemented features.

## 18. iOS UI / Safe Area Concerns

The existing UI has a strong baseline:

- `app/layout.tsx` sets `viewportFit: "cover"`.
- `components/layout/Navbar.tsx` adds `env(safe-area-inset-top)` above its fixed-height row.
- `components/layout/BottomNav.tsx` is fixed and pads `env(safe-area-inset-bottom)`.
- `components/layout/AppShell.tsx` uses `min-h-dvh`, left/right safe-area padding, and reserves bottom-nav plus home-indicator clearance in `<main>`.
- Realtime sheet components use bottom-safe-area padding, and map controls/legends include safe-area-aware offsets.

Remaining concerns:

- `app/globals.css` still gives `body` a `min-height: 100vh`; the shell's `dvh` mitigates this, but audit any screens rendered outside the shell.
- `components/realtime/rail/RailList.tsx` uses `calc(100vh - 400px)` and should use a dynamic viewport/shell-derived constraint in the native target.
- Verify every bottom sheet's maximum height and drag/scroll behavior with the home indicator, landscape safe areas, and the keyboard.
- There is no explicit `visualViewport`/keyboard adapter. Inputs in Plan, Board search, bus route search, auth, and location search need physical-device tests for keyboard avoidance and focus visibility.
- Test status-bar style in light/dark mode and whether the configured WebView overlays content.
- Test overscroll/rubber-banding around full-height maps, fixed navigation, drawers, and sheets.
- Preserve ≥44-point touch targets and VoiceOver semantics. The bottom nav already uses minimum 44 px targets, but route pills and map controls need device verification.
- Dynamic Island/notch behavior cannot be considered complete from a desktop mobile viewport; test at least a small iPhone and a modern notched/Dynamic Island device, portrait and landscape.

## 19. Security / Environment Variables

The audited environment variable names are:

- `DATABASE_URL`
- `MTA_BUS_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Values were not copied into this report. `DATABASE_URL` and `MTA_BUS_API_KEY` are server secrets and must never enter the native compile, JavaScript bundle, Capacitor config, Xcode build settings committed to source, logs, or client requests. Prisma/PostgreSQL, MTA credential use, feed ingestion, OTP, and proxy logic stay on Vercel.

The two `NEXT_PUBLIC_SUPABASE_*` values are already browser-visible. A Supabase anon key is not a server secret, but safety depends on correct Row Level Security and server authorization. Treat native bundle extraction as trivial and do not grant the anon role capabilities that depend on key secrecy.

No hardcoded Vercel API origin currently exists because clients use relative URLs. The new native API base is configuration, not a secret. Validate it against an allowlist or compile-time environment so a malformed value cannot silently direct authenticated traffic elsewhere.

Review ingestion endpoint authorization before launch. CORS is not authentication, and hiding a route from the native UI does not protect it.

## 20. Recommended Dev/Prod Configuration

| Mode | Frontend origin/build | API base | `server.url` | Service worker | Logging |
|---|---|---|---|---|---|
| Web development | Existing `next dev` | Same origin (`""`) | Not applicable | Disabled as today | Developer diagnostics; redact tokens/location. |
| Web production | Existing Vercel Next build | Same origin (`""`) | Not applicable | Existing Serwist PWA enabled | Structured production errors; no secrets/user data. |
| iOS development, bundled | Native target local asset output | HTTPS Vercel preview/dev backend | Omit | Disabled | Native bridge/network diagnostics allowed; redact sensitive data. |
| iOS development, live reload | Dev server reachable by simulator/device | Matching dev/preview backend | Temporary dev URL only | Disabled | Verbose temporary diagnostics. |
| iOS production | Versioned local asset bundle | Canonical `https://nyctransithub.vercel.app` API base (or dedicated API domain later) | **Omit** | Disabled | Minimal production telemetry/errors, no feed payload or precise-location logging. |

Use explicit build-time concepts such as `APP_TARGET=web|ios`, `API_BASE_URL`, and feature flags for native auth/SW only in the relevant build graph. Names may follow the native target's bundler convention, but only public configuration can be embedded. Avoid runtime branch sprawl throughout components; expose platform services through adapters.

Capacitor's current documentation is version 8. Start with compatible current major packages together: `@capacitor/core`, development dependency `@capacitor/cli`, and `@capacitor/ios`; add official plugins individually when their adapters are implemented. Capacitor 8 documents Node.js 22 or higher, Xcode 26.0 or higher, iOS 15 as the minimum, and Swift Package Manager as the default package manager. Confirm these requirements against the release actually selected at implementation time:

- [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Capacitor iOS documentation](https://capacitorjs.com/docs/ios)
- [Capacitor 8 update guide](https://capacitorjs.com/docs/updating/8-0)
- [Capacitor configuration reference](https://capacitorjs.com/docs/config)

The audit runtime Node v24.19.0 is compatible; the shell's Node v16.11.1 is not. Standardize local/CI/native build commands on the repository's documented modern Node runtime before adding packages. Capacitor `webDir` must point only at the native target's generated assets. Per the configuration reference, `server.url` is appropriate for live reload and should not be shipped in production.

## 21. Testing Baseline

Commands were run with the available Node v24.19.0 runtime or their direct CLI equivalent because `nvm` was unavailable.

| Check | Result | Existing observations |
|---|---|---|
| ESLint | Passed: 0 errors, 471 warnings | Warnings are dominated by vendored/copied skill trees (`.agent`, `.agents`, `.claude`, `.cursor`, `.kiro`) plus a script warning. Lint scope is noisy but did not block the app. |
| TypeScript | Passed | `tsc --noEmit` exited 0. |
| Unit/component tests | Passed | 68 files, 571 tests. Existing stderr includes React `act(...)` warnings in `LiveTrackerCard`, `CommuteCard`, and geolocation tests, plus intentional invalid-storage/geometry error logs. |
| Production build | Passed | Next 16.3.5 built all pages and server routes. Existing warnings: middleware deprecation, module-type warning, Serwist 3.02 MB precache exclusion, and restricted-network MTA DNS errors during crowding prerender. |
| Playwright | Not run | The requested baseline called for lint, typecheck, tests, and production build. The live mobile flows were manually exercised. Native work will require new device/simulator coverage. |

These are baseline observations, not Capacitor regressions. Do not mix cleanup of vendored lint warnings or test warning debt into the first native infrastructure change unless it blocks validation.

## 22. Required Changes Before Bundled iOS Build

The following are launch-blocking for a genuinely bundled frontend:

1. Define a separate native frontend build graph/output without altering the behavior of the existing Vercel target.
2. Ensure that output contains `index.html`, all finite route documents/router fallback behavior, CSS/fonts, icons, and required GTFS geometry; validate it offline before Capacitor integration.
3. Introduce the centralized configurable API client and migrate every caller listed in section 7.
4. Add narrowly scoped CORS/OPTIONS behavior to public Vercel APIs and automated tests for allowed/disallowed origins.
5. Keep ingestion/server surfaces non-public and audit their authentication.
6. Convert the native `/crowding` implementation from build-time server fetching/ISR to a client call.
7. Make `SubwayBullet` and all asset paths static-output compatible.
8. Disable Serwist generation/registration in the native target while preserving the web PWA.
9. Add the geolocation provider boundary and native permission/error behavior.
10. Add native-aware durable storage for favorites; define theme/session behavior.
11. Decide whether authentication/Commute ships in milestone one. If yes, implement and test native deep-link/token/session behavior; if no, hide or clearly disable those controls only in the native target.
12. Add App/Network lifecycle handling so polling pauses correctly and refreshes after resume without showing stale detail.
13. Define internal/external URL handling, direct-route startup, browser back, Universal Links, and stale realtime deep-link fallback.
14. Validate maps, keyboard, sheets, safe areas, status bar, orientation, accessibility, and tile/resource access on physical iPhones.
15. Standardize Node 22+ (prefer the documented Node 24 runtime) in local development and CI.

Only after the native web output passes these checks should the project initialize Capacitor, point `webDir` at that output, add iOS, and sync assets.

## 23. Optional Native Enhancements

These can wait until after the first physical-device build:

- branded SplashScreen timing and transitions;
- selective Haptics feedback;
- Share sheets for routes/stations/incidents;
- richer offline snapshots with explicit “last updated” timestamps;
- native appearance/status-bar polish beyond safe defaults;
- remote/push notifications, which are not part of the current web feature set;
- background refresh/location, which current requirements do not justify;
- a native map implementation, unless profiling demonstrates an actual Leaflet limitation;
- account-backed synchronization of anonymous browser favorites;
- analytics/crash reporting after privacy and data-retention decisions.

## 24. Risks / Unknowns

- The exact native frontend packaging approach (sibling Next app versus another static React shell) should be proven with a thin spike before mass-moving imports.
- Capacitor/iOS origin and navigation behavior must be verified against the selected Capacitor 8 release and generated project, not inferred solely from desktop browsers.
- Supabase email confirmation, OAuth if later added, token persistence, cookie expectations, and Row Level Security need a dedicated security design.
- Vercel API CORS changes may affect caching/CDN behavior; tests must cover `Vary: Origin`, preflight, errors, and credentials.
- MTA/network calls during `/crowding` build show current build-time external coupling; other feed imports should be monitored as the native graph is separated.
- Static GTFS/bus artifacts and map geometry may materially increase application binary size.
- Tile-provider mobile-app terms, quotas, attribution, and offline restrictions have not been legally validated by this code audit.
- Physical-device behavior remains unknown for permission prompts, keyboard resizing, app resume, memory pressure, VoiceOver, map gestures, rotation, status bar, and Dynamic Island/home-indicator overlap.
- The non-reproducible production hydration warning should be retested with isolated navigation steps and source maps.
- Current live data polling and error recovery were tested behaviorally, not under prolonged background/foreground cycles or poor connectivity.
- Current API rate limiting, ingestion authentication, and abuse controls were outside the requested code-change scope but are relevant once a public native client increases traffic.

## 25. Recommended Implementation Order

1. Record the native/web boundary and select the sibling build-target structure.
2. Create a minimal native static output containing the shared shell and one read-only page; prove local file loading without `server.url`.
3. Implement the typed API client, environment matrix, and one public endpoint end-to-end with CORS tests.
4. Migrate remaining public read-only API callers in thin vertical slices, preserving web same-origin behavior.
5. Move native crowding to client data loading and make images/assets/GTFS geometry export-safe.
6. Disable native service-worker behavior; add App/Network lifecycle adapters.
7. Add Geolocation and Preferences adapters, then validate Home/Nearby/Realtime/favorites.
8. Implement native routing startup, back behavior, external Browser policy, and Universal Links.
9. Make the explicit auth decision. Implement the full native Supabase flow or gate Commute/Auth from the first release.
10. Initialize Capacitor only after the web asset contract is stable; add iOS, core plugins, usage descriptions, status bar, and splash configuration.
11. Run simulator and physical-device matrices for maps, permissions, keyboard, safe areas, offline/resume, accessibility, dark mode, and stale detail.
12. Add CI that builds both targets, verifies that the native bundle contains no forbidden secrets/server modules, and exercises CORS/API contracts.
13. Ship optional polish only after the bundled production build works with `server.url` absent.

Each step should keep the existing Vercel build, PWA, and test suite green. Prefer small, reversible slices over converting all pages at once.

## 26. DO NOT BREAK

- Do not replace the production Capacitor bundle with a remote `server.url`; that is development-only.
- Do not enable `output: "export"` globally on the existing Vercel application.
- Do not move Prisma, PostgreSQL, MTA credentials, OTP, Nominatim policy logic, GTFS filesystem parsing, ingestion, or private environment variables into the browser/native bundle.
- Do not expose `DATABASE_URL` or `MTA_BUS_API_KEY`, and do not mistake a Supabase anon key for authorization.
- Do not broadly CORS-enable ingestion or authenticated endpoints. CORS is not authentication.
- Do not break web same-origin API calls, Supabase middleware/cookies, the auth callback, Serwist PWA behavior, or Vercel route handlers while adding the native target.
- Do not run the web service worker in the native bundle.
- Do not create dynamic realtime path routes for trip/vehicle IDs; preserve the existing query-state model unless a tested migration is intentional.
- Do not collapse multi-complex stations to one GTFS ID. Preserve `allIds`, `allPlatforms`, fetch every platform, and deduplicate arrivals by `tripId`.
- Do not change alert timing semantics: future-starting work is upcoming, not active; open-ended starts/ends remain supported.
- Do not bypass existing bracketed train-reference rendering, accessibility semantics, reduced-motion behavior, safe-area padding, or ≥44 px mobile targets.
- Do not replace Leaflet merely because the app is native; validate it first.
- Do not cache realtime responses without visible freshness timestamps and bounded expiry.
- Do not assume website localStorage/favorites will migrate into an App Store container.
- Do not ship native authentication until callback, token storage, deep links, server validation, and RLS have been tested together.
- Do not initialize or sync an iOS project until the separate native web output and API boundary are proven.

Useful platform references for implementation are the [Capacitor getting-started guide](https://capacitorjs.com/docs/getting-started), [storage guidance](https://capacitorjs.com/docs/guides/storage), [deep-link guide](https://capacitorjs.com/docs/guides/deep-links), [security guidance](https://capacitorjs.com/docs/guides/security), and [environment-specific configuration guide](https://capacitorjs.com/docs/guides/environment-specific-configurations).
