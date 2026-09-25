# iOS physical-device and release checklist

Use this checklist after `npm run ios:build`. Repository and simulator checks cannot mark physical-device, signing, TestFlight, or App Store items complete.

## Repository gate

- [ ] Use Node 24 (`node --version`); Capacitor 8 requires Node 22 or newer.
- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run ios:build`
- [ ] Confirm `ios/App/App/capacitor.config.json` has no `server` object.
- [ ] Run an unsigned Release simulator build with `xcodebuild` when the required simulator runtime is installed.
- [ ] Confirm the production web baseline still loads its core routes.

## Identity, version, and assets

- [ ] Display name is **NYC Transit Hub**.
- [ ] Bundle identifier is **com.abirhossain.nyctransithub** and is available to the selected Apple team.
- [ ] Deployment target is iOS 15.0.
- [ ] Xcode target **General > Identity > Version** is the intended marketing version.
- [ ] Xcode target **General > Identity > Build** is higher than every build already uploaded for that version.
- [ ] Replace the default Capacitor app icon with approved 1024×1024 opaque square production artwork; do not pre-round corners or include transparency.
- [ ] Review the checked-in launch artwork on compact/large iPhone and iPad layouts and approve it as final branding.
- [ ] Verify App Store screenshots, description, support URL, privacy-policy URL, age rating, category, and review notes in App Store Connect.

## Signing

- [ ] Open `ios/App/App.xcodeproj` through `npm run cap:ios`.
- [ ] Select the **App** target, then **Signing & Capabilities**.
- [ ] Leave **Automatically manage signing** enabled.
- [ ] Select your Personal Team or paid Developer Program team; do not commit a Team ID.
- [ ] Resolve any bundle-ID or provisioning issue shown by Xcode.
- [ ] Confirm no unneeded capability appeared. Push Notifications, Background Modes, and Associated Domains are intentionally absent.

A free Personal Team can normally run a development build on the account owner's devices, with provisioning limitations and short-lived signing. TestFlight, App Store Connect distribution, App Store submission, and broader registered-device distribution require paid Apple Developer Program membership.

## Install and launch

- [ ] Clean install on a physical iPhone.
- [ ] First launch shows the launch artwork and then a usable Home screen.
- [ ] Repeat launch does not hang on the splash screen.
- [ ] Background and resume preserve the current route and selection.
- [ ] Force quit and reopen succeeds.
- [ ] App launches from bundled assets with Wi-Fi and cellular disabled; it must not depend on `server.url` for its shell.
- [ ] No development URL, debug banner, mock data, or test credential appears.

## Permissions

- [ ] On first user-initiated location action, the prompt explains nearby stations, stops, and live departures.
- [ ] **Allow While Using App** loads nearby results and recenters maps.
- [ ] **Don't Allow** leaves station/place search usable and shows clear recovery guidance.
- [ ] Change Location access later in **Settings > Privacy & Security > Location Services > NYC Transit Hub** and verify the app adapts after resume.
- [ ] Confirm the app never asks for Always/background location, notifications, camera, microphone, photos, contacts, or Bluetooth.

## Core rider flows

- [ ] Home: cards load independently; unavailable data does not blank the page.
- [ ] Nearby: use current location, search/move origin, select a station/stop, and inspect departures.
- [ ] Nearby: swipe/change subway direction without losing the selected context.
- [ ] Subway train detail: open an individual trip, switch map/diagram, use back navigation, and handle an expired trip gracefully.
- [ ] Bus nearby: load nearby stops/routes and verify reported positions are not described as predictions.
- [ ] Bus detail: select a route/vehicle and return without losing mode.
- [ ] Plan: enter origin/destination, toggle step-free routing, handle no-result/error states, and dismiss the keyboard.
- [ ] Station Board: test Subway, LIRR, Metro-North, and Buses tabs; save/remove a station.
- [ ] Accessibility: filter outages and open step-free planning.
- [ ] Reliability, Crowding, and Service Changes: verify data labels do not overstate official metrics, occupancy, or alert timing.
- [ ] About: external links open outside the app's internal router.
- [ ] Native navigation has no Sign In or Commute dead end; those features are intentionally withheld.

## Map and rotation

- [ ] Pan and pinch both Nearby and Realtime maps.
- [ ] Select a route and vehicle/train marker.
- [ ] Recenter using location.
- [ ] Open, scroll, and dismiss the detail bottom sheet without moving the map underneath it.
- [ ] Keep provider attribution visible.
- [ ] Rotate through portrait, landscape-left, and landscape-right; map size recovers without a reload.
- [ ] On iPad, verify all four declared orientations if iPad remains a supported destination.

## Connectivity and freshness

| Scenario | Expected result |
|---|---|
| Airplane mode before launch | Bundled shell opens. Realtime areas say unavailable/offline; no old ETA is presented as current. |
| Lose connection while using Nearby | Existing static context can remain, but live departures visibly become unavailable/stale and polling stops. |
| Connection returns | One refresh occurs, the selected route/origin remains, and freshness time advances only after a successful response. |
| Background a live screen beyond its polling interval, then resume | Selection and scroll state remain; stale data refreshes promptly without duplicate polling. |
| Vercel backend unavailable | The affected surface shows a retryable unavailable state; independent screens/navigation remain usable. |
| MTA upstream unavailable or partial | The API/UI distinguishes unavailable/partial data and does not fabricate or silently reuse an old realtime countdown. |
| Switch Wi-Fi to cellular and back | Requests recover without a reload loop or blank screen. |

- [ ] Exercise the matrix above with a proxy/network conditioner where practical.
- [ ] Check that offline recovery never labels cached ETA/countdown data as live.

## UI and accessibility

- [ ] Light mode and dark mode.
- [ ] Compact iPhone, 390/393-point iPhone, and 430-point iPhone; include a Dynamic Island device.
- [ ] Increase Dynamic Type/text size where practical; essential actions remain visible and operable.
- [ ] VoiceOver order and labels for navigation, route selectors, maps/list alternatives, dialogs, and controls.
- [ ] Keyboard focus remains visible; fixed bottom navigation hides/restores correctly.
- [ ] Header, sheets, map controls, and last scroll item clear the notch and home indicator.
- [ ] Touch targets and swipe gestures remain usable with reduced motion enabled.

## App Store review risk check

- [ ] Production app icon has replaced the Capacitor placeholder.
- [ ] No placeholder/demo screen, debug control, broken link, or unfinished feature is reachable.
- [ ] Logged-out and empty states are complete; native auth/Commute controls remain hidden until implemented.
- [ ] Location is requested only in context and denial has a useful fallback.
- [ ] The app demonstrates meaningful rider functionality beyond a trivial remote website wrapper and launches its shell offline.
- [ ] No external payment or purchase path exists without an approved product/policy design.
- [ ] Claims about realtime data, train positions, reliability, and crowding match the implementation.
- [ ] CARTO/Esri mobile-app terms, attribution, quotas, and privacy implications have been reviewed by the owner.
- [ ] Privacy notes were reconciled with current production logging and App Store Connect answers.

## Development install

1. Run `npm run ios:build`.
2. Run `npm run cap:ios`.
3. In Xcode, select **App > Signing & Capabilities**, enable automatic signing, and choose your team.
4. Connect and trust the iPhone, enable Developer Mode if iOS requests it, and choose it as the run destination.
5. Choose **Product > Run** (`Command-R`).
6. Complete every applicable physical-device item above; do not mark it passed from a simulator result.

## Archive, TestFlight, and App Store

1. Finish `npm run ios:build`; the Xcode Release guard will fail if a prior live-reload `server.url` or bundled assets are unsafe/missing.
2. Set the Xcode Version and increment the Build number.
3. Select the **App** scheme and a generic/connected iOS device destination suitable for archiving.
4. Choose **Product > Archive**. When the build finishes, Xcode opens **Organizer > Archives**; otherwise choose **Window > Organizer**.
5. Select the archive and choose **Validate App** before upload when available. Resolve every validation/signing/privacy issue.
6. For a paid team, choose **Distribute App > TestFlight & App Store** (or **TestFlight Internal Only** when appropriate), review signing/build-number options, and upload to App Store Connect.
7. In App Store Connect, wait for processing, complete export-compliance/privacy/beta metadata, and assign the build to internal/external TestFlight testing.
8. After testing, attach the intended build to the App Store version, complete metadata and review notes, and submit for App Review.

No archive upload, TestFlight distribution, or App Store submission is complete until performed with the app owner's paid Apple Developer Program team and App Store Connect access.
