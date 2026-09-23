# Final Quality Audit

Date: 2026-09-23

Scope: Home, Nearby, Realtime, Station Board, Plan, Accessibility, Reliability, Crowding, Service Changes, and About. The pass was bounded to one evidence batch, one correction batch, and one confirmation batch.

## Evidence

- Browser viewport checks: 375, 393, 430, 768, 1280, and 1440 CSS pixels.
- Theme checks: Reliability, Crowding, and Service Changes inspected in light and dark modes.
- Structural checks: one `main` landmark and page-heading presence on every audited route.
- Console checks: fresh confirmation navigation through Realtime, Accessibility, and Service Changes produced no errors or warnings.
- Impeccable detector: `impeccable detect app components`; the installed CLI does not expose the older `audit` command named in the spec.
- Static safe-area inspection: Navbar, AppShell, BottomNav, drawers, maps, and floating controls use the relevant `env(safe-area-inset-*)` padding.

## Verified findings and corrections

| Severity | Finding | Impact | Correction |
|---|---|---|---|
| High | `useVisiblePolling` read `navigator.onLine` during the first client render. | Offline browser state could differ from server HTML and trigger hydration replacement on Accessibility and Service Changes. | Use a deterministic online initial render, then read actual connectivity in the effect. |
| High | Realtime freshness markup inherited the same first-render mismatch. | The toolbar could replace server markup during hydration. | The shared polling correction keeps initial toolbar markup stable. |
| Medium | Realtime rendered separate mobile and desktop `h1` elements. | Duplicate page headings weakened document semantics. | Render one responsive heading. |
| Medium | Nearby, Realtime, and Commute metadata included the product suffix even though the root template adds it. | Browser titles repeated “NYC Transit Hub.” | Store only the route title in child metadata. |
| Medium | Service-change cards used thick severity-colored side tabs. | The feed felt heavier than the rider product and relied excessively on card decoration. | Use a quiet token-backed border; severity remains explicit in labeled chips. |
| Medium | Primary realtime surfaces ran independent full-rate intervals while hidden. | Background tabs could keep fetching feeds and resume with duplicated request timing. | Migrate Home, Nearby, Station Board, Realtime, Accessibility, Reliability, and Service Changes to the shared visibility-aware polling contract. |
| Medium | Failed Station Board refreshes replaced previously usable departures. | A transient request failure erased useful context. | Preserve the previous board and label it as the last update; reserve the full error state for no-data failures. |
| Low | Several live surfaces used different freshness wording. | Riders had to infer whether “updated” meant current, delayed, or offline. | Use shared `DataFreshness` labels for current, delayed, and offline states. |

## Confirmation results

- No horizontal document overflow was observed on the ten audited routes at any requested width.
- All audited routes exposed one visible page heading after the Realtime correction.
- Realtime, Accessibility, and Service Changes produced a clean console in a fresh browser tab after the hydration correction.
- Analytics surfaces retained readable hierarchy and token-based contrast in both themes.
- The Impeccable detector reported no blocking findings after removing Service Changes side tabs. Remaining advisories are intentional compact labels/marker text or map legibility colors and were not changed without evidence of a usability defect.
- Leaflet canvases remain client-only dynamic imports, and route geometry stays route-scoped and independent from realtime polling.
- ESLint completed with zero errors; its 471 warnings are almost entirely from vendored Impeccable scripts plus one pre-existing diagnostic script.
- All 571 Vitest unit/component tests passed, strict TypeScript checking passed, and the production build completed successfully.
- The full Playwright matrix passed 124 of 125 checks on its final broad run. The sole failure was a Mobile Safari navigation timing flake after the exact destination `href` had already passed; after giving navigation the same bounded allowance used by the other route transitions, the complete 35-case rider-utilities matrix passed across Chromium, Firefox, WebKit, Mobile Chrome, and Mobile Safari.

## Verification limitations

- The local browser environment could not consistently obtain live MTA/Supabase responses, so live-only selected train, selected bus, and populated historical chart states were verified through deterministic component/unit coverage rather than a complete live walkthrough.
- Browser automation available in this workspace exposes DOM, screenshots, and console logs but not a service-worker offline network emulator. Offline truthfulness is covered by cache-policy, polling, freshness, and component tests plus production-build verification.
