# iOS privacy implementation notes

These notes describe the checked-in implementation as of 2026-09-25. They are an engineering inventory to help the app owner prepare App Store privacy disclosures; they are not legal advice and are not final App Store Connect answers.

## Native release scope

The first native release is a bundled Capacitor frontend that calls the NYC Transit Hub backend at `https://nyctransithub.vercel.app`. Native authentication and Commute are intentionally not exposed. The iOS target does not include analytics, advertising, crash-reporting, payment, push-notification, background-location, or social SDKs.

## Data accessed or transmitted

| Data or access | Trigger and purpose | Destination / persistence | Implementation notes |
|---|---|---|---|
| Foreground location | A rider chooses a current-location action for nearby stations, stops, departures, or map recentering | Coordinates are held in app memory and included in nearby API query parameters sent over HTTPS to the NYC Transit Hub Vercel backend | The app does not request background location. The repository does not define backend log retention, so do not claim that coordinates are never retained by hosting infrastructure. |
| Place, station, and destination searches | A rider enters a search or trip-planning query | Sent over HTTPS to the Vercel backend; the backend may call MTA services, Nominatim, or the MTA-hosted OpenTripPlanner depending on the endpoint | Search text can contain user-entered place information. No client-side search-history store was found. |
| Transit selections and requests | Loading arrivals, alerts, accessibility status, maps, reliability, crowding, or route data | Sent to the Vercel backend; MTA and other upstream requests occur server-side | MTA credentials and server feed clients are not bundled in the iOS app. |
| Saved station preferences | A rider saves or removes stations/routes | Stored on-device with Capacitor Preferences; an older WebView `localStorage` value can be migrated and remains a fallback if the plugin fails | The Preferences plugin uses iOS `UserDefaults`. No native account sync is implemented. |
| Theme and UI preferences | A rider changes theme or UI state | Stored in the WebView/browser storage on the device | These are app settings, not advertising identifiers. |
| Map tiles | Opening Nearby or Realtime maps | Requested directly from Esri or CARTO tile hosts; the provider can receive normal network metadata such as IP address and requested tile coordinates | No offline tile cache is implemented. Provider terms and disclosure requirements still require owner review. |
| External links | A rider opens an About/credit link | Opened with the Capacitor Browser plugin to the selected external site | The destination receives normal browser request metadata. |

## Location permission declarations

`Info.plist` contains:

- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`

Both say that location is used to show nearby subway stations, bus stops, and live departures. The app requests only the plugin's foreground `location` permission. The current `@capacitor/geolocation` iOS dependency requires the second declaration because its underlying library references background-capable APIs; the app does not enable Background Modes or implement background geolocation.

## Apple privacy manifest

`ios/App/App/PrivacyInfo.xcprivacy` declares `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1`, as required by the installed `@capacitor/preferences` plugin for app-specific preferences. Capacitor's core SPM packages also contain their own manifests. This manifest is not a substitute for App Store Connect privacy answers.

## Analytics, tracking, accounts, and payments

- No analytics or advertising SDK was found in the native build graph.
- No App Tracking Transparency request or tracking domain is configured.
- Native authentication and Commute are hidden pending a complete deep-link, token-storage, server-validation, and RLS design.
- The native route set contains no purchase, subscription, or external payment flow.
- No push notifications, associated domains, background modes, contacts, camera, microphone, photos, Bluetooth, HealthKit, or motion permission is configured.

## App Store disclosure follow-up

Before submission, the app owner should verify current production behavior and hosting/provider contracts, then decide how App Store Connect should classify:

- precise location sent for optional Nearby requests;
- user-entered search/destination text;
- diagnostics or request logs retained by Vercel and any configured backend observability;
- IP/network data processed by Vercel, Esri, CARTO, Nominatim, OTP, and MTA services;
- any analytics, crash reporting, accounts, push, or monetization added after this audit.

Repeat this inventory whenever the native route set, plugins, backend logging, or third-party services change.
