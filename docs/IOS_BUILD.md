# iOS build architecture

NYC Transit Hub has two independent production build graphs that share browser-safe React components:

```text
Web browser -> Next.js/Vercel -> relative /api requests
iOS bundle  -> Vite static assets in Capacitor -> https://nyctransithub.vercel.app/api/*
                                                -> Vercel server -> MTA/GTFS/OTP/database
```

The Next.js application remains the web frontend and server. The native frontend starts at `native/main.tsx`, aliases the small set of Next client navigation/image helpers that shared components use, and emits a static bundle into `capacitor-web/`. It does not import `app/api`, middleware, Prisma, server-side Supabase code, or MTA credentialed clients.

Native authentication and Commute are intentionally withheld until callback deep links, token storage, bearer-token validation, and Supabase RLS are designed and tested together. No server secret belongs in a `NEXT_PUBLIC_*` value or the iOS bundle.

## Requirements

- Node.js 24 (Node 22 or newer is required by Capacitor 8)
- Xcode 26 or newer for iOS builds
- npm dependencies installed with `npm ci`
- A deployed NYC Transit Hub backend; production uses `https://nyctransithub.vercel.app`

## Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_TARGET` | Shared client code | Set by the native Vite config to `ios`; web defaults to `web`. Do not set this for the normal web build. |
| `NEXT_PUBLIC_API_BASE_URL` | Native build only | Public HTTPS origin for hosted NYC Transit Hub APIs. Defaults to `https://nyctransithub.vercel.app`. It must be an HTTPS origin with no path or credentials. |
| `NATIVE_API_ALLOWED_ORIGINS` | Vercel server only | Optional comma-separated extra development origins. Production always permits the exact iOS origin `capacitor://localhost`; only enumerated read APIs are CORS-enabled, so commute, ingestion, and future endpoints remain excluded by default. |
| `CAPACITOR_USE_REMOTE_SERVER` | Capacitor development only | Must equal `true` before `server.url` is emitted. Never use it for a production build. |
| `CAPACITOR_SERVER_URL` | Capacitor development only | HTTPS deployed site or LAN live-reload URL. Ignored unless remote mode is explicitly enabled. |

`DATABASE_URL`, `MTA_BUS_API_KEY`, and other private server configuration stay in Vercel. The production native build verifies that server-only names/modules, local development URLs, and service-worker registration are absent from the generated bundle.

## Web development

```bash
npm run dev
```

The browser UI and APIs share the Next.js origin, so frontend calls remain relative `/api/...` requests. Serwist is disabled by the existing development configuration.

For access from another device on the LAN:

```bash
npm run dev:lan
```

## Web production

```bash
npm run build
npm run start
```

This is the existing full Next.js server build. It retains route handlers, Supabase middleware/cookies, image behavior, and the Serwist PWA. Native build settings do not change the web target.

## iOS development

### Bundled frontend in a browser

Run the native frontend against the hosted production API:

```bash
npm run native:dev
```

For a phone on the LAN, use:

```bash
npm run native:dev:lan
```

If this LAN origin calls a deployed Vercel API directly, add that exact origin to the Vercel server's `NATIVE_API_ALLOWED_ORIGINS` development configuration. Do not add a wildcard.

### Capacitor live reload

Remote loading is an explicit development mode. It may load the deployed web app:

```bash
npm run ios:dev
```

or a LAN native Vite server:

```bash
CAPACITOR_SERVER_URL=http://192.168.1.23:5173 npm run ios:dev
```

Every remote-mode change requires a Capacitor sync. `server.url` is not part of the default configuration and is not used by `ios:build`.

## iOS production

Run the complete deterministic build and sync:

```bash
npm run ios:build
```

The command:

1. builds the sibling Vite frontend into `capacitor-web/`;
2. verifies `index.html`, secret/server-module exclusions, local-URL exclusions, and service-worker omission;
3. clears remote-server environment variables for the Capacitor sync; and
4. copies the bundled assets into the iOS project.

Open the already-synced project afterward:

```bash
npm run cap:ios
```

The production app loads HTML, CSS, JavaScript, icons, subway bullets, and route geometry from its installed bundle. Realtime and planning data still require the deployed Vercel APIs and network access.

## Routing, assets, and freshness

- Realtime train and bus detail remains query state on `/realtime`; trip and vehicle IDs are not generated as static paths.
- The native history adapter preserves query strings, replace/push behavior, and browser back inside the WebView.
- Vite copies `public/icons` and `public/data/gtfs/subway-geometry` into the native bundle.
- `next/image` is replaced only in the native graph by a plain static image component, so native subway icons never depend on the Next image optimizer.
- The native graph does not include or register the Serwist service worker. API requests continue to use the existing polling/cancellation behavior and are not precached as bundled resources.
- Public read APIs accept the exact `capacitor://localhost` origin. Authenticated commute and ingestion APIs are deliberately not CORS-enabled.

## Native capability adapters

Shared client code uses the adapters under `lib/platform/` instead of checking
the user agent. `Capacitor.getPlatform()` and `Capacitor.isNativePlatform()`
select the native implementation; the normal browser keeps standards-based
fallbacks. Importing these modules during server rendering is safe because
browser globals are read lazily.

| Capability | iOS implementation | Web fallback |
| --- | --- | --- |
| Location | `@capacitor/geolocation` | Permissions and Geolocation browser APIs |
| App lifecycle | `@capacitor/app` pause/resume events | `visibilitychange` |
| Connectivity | `@capacitor/network` | `navigator.onLine` and online/offline events |
| Preferences | `@capacitor/preferences` | `localStorage` |
| Status bar | `@capacitor/status-bar` | No-op |
| Launch screen | `@capacitor/splash-screen` | No-op |
| Keyboard | `@capacitor/keyboard` | Native browser behavior |
| Feedback | `@capacitor/haptics` | No-op |
| External HTTP(S) links | `@capacitor/browser` | Normal browser navigation |

`@capacitor/share` is intentionally not installed. The current app has no
share action, and its native deep-link/Universal Link contract is not yet
defined. Add Share only alongside a concrete product flow and a tested URL
contract.

### Location permissions and errors

All current-location consumers share one `LocationService`, so concurrent page
requests coalesce instead of presenting duplicate permission requests. The
service exposes a normalized permission state (`prompt`, `granted`, `denied`,
`restricted`, or `unavailable`) and stable errors for denial, restriction,
unavailability, timeout, and temporary failures. A denial never falls back to
a guessed coordinate; station search remains available as the recovery path.

The iOS target declares both required usage descriptions in `Info.plist`:

- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`

Both explain that location is used to show nearby stations, bus stops, and live
departures. The app currently requests foreground location only.

### Lifecycle and connectivity

Realtime polling stops when the app is paused, the document is hidden, or the
device reports no network connection. On native resume, data refreshes only
when the previous refresh is older than the polling interval. This preserves
the current route, selected mode, trip or vehicle, map state, and scroll state;
the lifecycle adapter never reloads the page.

Network state is a UI and polling hint, not proof that Vercel or an MTA upstream
is reachable. Request-level failures still use the existing error handling. The
offline page listens for a real offline-to-online transition before reloading.

### Native chrome, splash, and haptics

The status bar follows the resolved light/dark theme, uses a matching
background, and does not overlay the WebView. The native launch screen uses the
bundled transit artwork and remains visible until the initial React route has
committed, then fades out. Haptics are deliberately sparse: light feedback is
used for meaningful realtime service/vehicle selections, not scrolling,
polling, or every tap.

### Keyboard and orientation

The keyboard uses Capacitor's native WebView resize mode. While it is visible,
the fixed mobile navigation is hidden and its reserved content inset collapses
to the normal page gutter, leaving the focused Plan or search control in the
usable viewport. The keyboard style follows the app's selected light/dark
theme, and its backdrop color is derived from the current DOM surface.

The iPhone target intentionally supports portrait plus landscape-left and
landscape-right. It does not support upside-down portrait on iPhone; iPad keeps
all four orientations. Map containers use dynamic viewport units and Leaflet's
existing size invalidation so supported rotations can recover without a page
reload.

### Preference migration

Station preferences use the native Preferences store on iOS. On the first
native read, an existing value in the WebView's `localStorage` is copied into
Preferences, preserving data from older bundled builds. Plugin failures degrade
to `localStorage`; the web build continues to use its existing synchronous
storage behavior.

## Device-only validation

After `npm run ios:build`, validate on a physical iPhone using the checklist in [`IOS_DEVICE_TESTING.md`](./IOS_DEVICE_TESTING.md). Simulator/build checks cannot prove location permission prompts, map gestures and tile policies, keyboard avoidance, safe areas, VoiceOver, background/resume refresh, Universal Links, or App Store signing.
