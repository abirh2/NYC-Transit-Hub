# iOS physical-device development testing

This repository contains both a development remote-server mode and the
production bundled Capacitor architecture described in
[`IOS_BUILD.md`](./IOS_BUILD.md). Production builds load generated assets from
`capacitor-web/`; they do not require `server.url`.

## Requirements

- macOS with Xcode 26 or newer
- Node.js 22 or newer (the repository's documented Node 24 runtime is supported)
- An iPhone running iOS 15 or newer
- An Apple ID added to Xcode for development signing
- The Mac and iPhone on the same network when using LAN mode

Install the JavaScript dependencies from the repository root:

```bash
npm ci
```

Capacitor uses `capacitor-web/` as its deterministic generated web directory.
Build and sync a production bundle with `npm run ios:build`. Development app
content is enabled explicitly with `CAPACITOR_USE_REMOTE_SERVER=true`.

## Recommended path: test the bundled app

Use the bundled build for release-like device testing:

```bash
npm run ios:build
npm run cap:ios
```

In Xcode:

1. Select the **App** project and **App** target.
2. Open **Signing & Capabilities**, keep automatic signing enabled, and choose your own team.
3. Verify the bundle identifier is `com.abirhossain.nyctransithub`.
4. Connect/trust the iPhone, enable Developer Mode if requested, and choose it as the run destination.
5. Press `Command-R`.

This path proves the app shell comes from installed assets. A free Personal Team is sufficient for development on the account owner's devices, subject to Apple's provisioning limits and expiration. TestFlight and App Store distribution require paid Apple Developer Program membership.

## Optional fast iteration: use the deployed website

Run:

```bash
npm run ios:dev
```

`ios:dev` opts into remote loading, defaults to
`https://nyctransithub.vercel.app/`, syncs the iOS project, and opens Xcode.
The normal Capacitor configuration does not contain a `server.url` unless this
explicit development mode is enabled.

In Xcode:

1. Select the **App** project, then the **App** target.
2. Open **Signing & Capabilities** and select your development team.
3. Connect the iPhone by USB. Unlock it and accept the trust prompts, or pair it
   in Finder for wireless development.
4. Select the iPhone from Xcode's run-destination menu.
5. Click **Run** or press `Command-R`.
6. If iOS blocks the first launch, open **Settings > General > VPN & Device
   Management**, select the developer profile, and trust it. Reopen the app.

## LAN mode: use the Mac's Next.js development server

First determine the Mac's LAN IP address in **System Settings > Network**, or
run `ipconfig getifaddr en0` for a typical Wi-Fi connection. Suppose it is
`192.168.1.23`.

Start Next.js on all network interfaces in one terminal:

```bash
npm run dev:lan
```

In another terminal, sync the exact LAN URL and open Xcode:

```bash
CAPACITOR_SERVER_URL=http://192.168.1.23:3000 npm run ios:dev
```

Keep the Next.js terminal running while using the app. Do not use `localhost`
in the device URL: on an iPhone, `localhost` means the iPhone itself.

The generated iOS project declares `NSAllowsLocalNetworking`, which permits
local HTTP development without enabling arbitrary insecure web content. The
Capacitor config also marks an explicitly configured HTTP URL as cleartext for
platforms that consult that setting. Production should use HTTPS and remove the
local-network ATS declaration if local HTTP development is no longer required.

## Switching modes

Use the deployed site:

```bash
CAPACITOR_SERVER_URL=https://nyctransithub.vercel.app/ npm run ios:dev
```

Use a LAN server:

```bash
CAPACITOR_SERVER_URL=http://192.168.1.23:3000 npm run ios:dev
```

Remove remote loading and build/sync the bundled production assets:

```bash
npm run ios:build
```

Every mode change requires a Capacitor sync before the next Xcode build. You
can reopen the native project without changing its current synced mode with:

```bash
npm run cap:ios
```

## Physical-device checklist

Verify these flows in both light and dark mode:

- Launch and Home dashboard loading
- Nearby search, location permission, map tiles, and current-location control
- Realtime map initialization, mode changes, route selection, and detail sheet
- Plan (`/routes`) inputs and results
- Home, Nearby, Map, Plan, and More navigation, including back navigation
- Header clearance around the notch/Dynamic Island
- Bottom navigation and sheets above the home indicator
- Keyboard visibility for search and route-planning inputs
- External informational links open in the Capacitor browser while internal
  routes stay inside the application
- Background the app for at least ten minutes from a live-arrival screen, then
  resume and confirm stale ETAs refresh promptly without losing the selection
- Portrait, landscape-left, and landscape-right layout

Repeat the visual/interaction pass at representative iPhone widths: a compact
width, the 390/393-point class, and the 430-point class. Include at least one
Dynamic Island device. For each size, verify that:

- the header, map controls, sheets, and bottom navigation clear system areas;
- the last scrollable item remains visible above the home indicator;
- collapsed Nearby allows a normal vertical page scroll while horizontal map
  movement and pinch zoom still work;
- Realtime remains map-dominant and its detail sheet does not scroll the map
  underneath it; and
- focusing Plan, station, and destination fields hides the fixed bottom nav,
  keeps the active control visible, and restores navigation after dismissal.

The repository checks can validate the web build and native project, but they
cannot substitute for these physical-device checks. Do not record them as
passed until they have been exercised on an iPhone.

Use the full install, permission, rider-flow, map, connectivity, UI,
accessibility, archive, and distribution matrix in
[`IOS_RELEASE_CHECKLIST.md`](./IOS_RELEASE_CHECKLIST.md). That checklist also
covers location denial/Settings changes, Wi-Fi/cellular/airplane mode,
Vercel/MTA failure, and TestFlight/App Store boundaries.

## LAN troubleshooting

- Confirm the Mac and iPhone are on the same Wi-Fi network and client isolation
  is disabled on that network.
- Open `http://<mac-ip>:3000` in Safari on the iPhone. If Safari cannot reach
  it, the Capacitor app cannot reach it either.
- Confirm `npm run dev:lan` reports `0.0.0.0`, not only `localhost`.
- Allow incoming connections for Node.js in the macOS firewall, if prompted.
- Re-run `CAPACITOR_SERVER_URL=http://<mac-ip>:3000 npm run ios:dev` after an IP
  address or port change.
- In Xcode, inspect the debug console for WebKit navigation or ATS errors.
- Prefer the HTTPS Vercel mode on restrictive corporate, guest, or public Wi-Fi.

## Useful commands

```bash
npm run cap:sync  # sync the current config and web directory into iOS
npm run cap:ios   # open the generated iOS project in Xcode
npm run ios:dev   # opt into remote mode, sync, and open Xcode
npm run ios:build # build, verify, and sync the bundled production frontend
npx cap run ios   # select and run a simulator/device from the CLI
```

The Capacitor workflow and configuration behavior are documented in the
[Capacitor installation guide](https://capacitorjs.com/docs/getting-started),
[iOS guide](https://capacitorjs.com/docs/ios), and
[configuration reference](https://capacitorjs.com/docs/config). Apple's
transport-security guidance is in
[NSAllowsLocalNetworking](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowslocalnetworking).
