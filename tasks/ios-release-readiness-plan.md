# Implementation Plan: iOS Release Readiness

## Overview

Audit and harden the checked-in Capacitor 8 iOS project for unsigned simulator builds, physical-device preparation, and later App Store distribution without claiming Apple-account or device work that cannot be performed here.

## Architecture Decisions

- Keep the bundled Vite frontend as the production iOS artifact; `server.url` remains development-only.
- Keep iOS 15.0 because Capacitor 8.5.2 and every installed native plugin declare iOS 15 as their minimum.
- Keep Xcode build settings as the source of truth for the iOS marketing version and build number; `package.json` remains the JavaScript package version.
- Add only the privacy manifest and location declarations required by implemented plugins. Do not add entitlements or capabilities.
- Treat the existing Capacitor app icon as a development placeholder, not production artwork.

## Task List

### Phase 1: Native configuration and release guards

- [x] Add tested validation for the production native API origin.
- [x] Strip console/debugger statements from the release web bundle and verify forbidden content.
- [x] Make Xcode Release builds fail if synced Capacitor configuration contains `server.url`.
- [x] Add the Preferences required-reason privacy manifest to the app target.

### Checkpoint: Native configuration

- [x] Focused tests pass.
- [x] Release configuration contains no Team ID, unused entitlement, or remote server URL.

### Phase 2: Documentation and review

- [x] Update the audit and build/device documentation with current native-project facts.
- [x] Add factual iOS privacy notes and the physical-device/release checklist.
- [x] Add a concise iOS section to the README.
- [x] Correct overbroad privacy/offline wording found during review.

### Checkpoint: Documentation

- [x] Commands, paths, versioning, signing, assets, privacy, offline, and archive steps match source.
- [x] App Store risks and manual blockers are explicit.

### Phase 3: Validation

- [x] Run lint, typecheck, full tests, web production build, native build/verification, Capacitor sync, and signing-independent simulator build when available.
- [x] Recheck the live production web routes at a mobile viewport.
- [x] Review the complete diff for correctness, security, readability, architecture, and performance.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A prior live-reload sync is archived accidentally | High | Release-only Xcode build phase rejects generated `server.url` |
| A local/test backend is compiled into the native bundle | High | Validate an HTTPS, public, origin-only API base before Vite builds |
| App Store privacy validation rejects Preferences usage | High | Add the plugin-documented UserDefaults required-reason manifest |
| Placeholder artwork is mistaken for final branding | High | Document exact blocker; do not label it App Store-ready |
| Device-only behavior is overstated | High | Separate automated evidence from manual iPhone/signing steps |

## Open Questions

None blocking. Final app icon artwork, Apple signing, physical-device execution, and App Store Connect work remain owner actions.
