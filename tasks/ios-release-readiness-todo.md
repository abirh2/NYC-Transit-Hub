# iOS Release Readiness Tasks

Status: repository implementation and automated validation complete. Apple signing, physical-device execution, final artwork approval, and App Store Connect work remain manual owner steps.

## Task 1: Release configuration guardrails

**Acceptance:** A native production build rejects non-HTTPS, credentialed, path-bearing, loopback, link-local, or private-network API origins; release assets contain no console/debugger statements; Xcode Release rejects a synced `server.url`.

**Verification:** Focused Vitest tests, `npm run native:build`, `npm run native:verify`, and a Release simulator build.

**Dependencies:** None

## Task 2: Native privacy and project audit

**Acceptance:** The target contains the Preferences required-reason privacy manifest, only required location purpose strings, no unused capabilities, no Team ID, and a documented asset/version/signing audit.

**Verification:** `plutil`, project-setting inspection, Capacitor sync, and signing-independent build.

**Dependencies:** Task 1

## Task 3: Privacy, offline, and release documentation

**Acceptance:** Privacy notes are factual; the release checklist covers the requested device/network/UI matrix; build/device docs explain versioning, signing, archive, TestFlight/App Store boundaries, assets, and known risks; README links the iOS docs.

**Verification:** Link/command/source review and focused wording tests where behavior changes.

**Dependencies:** Task 2

## Task 4: Final quality gate

**Acceptance:** All requested automated checks pass or have exact blockers recorded; the live web baseline remains healthy; final report distinguishes repository readiness from Apple-account/device completion.

**Verification:** Lint, typecheck, full tests, web build, native build/verify/sync, Xcode simulator build, live mobile route check, and final diff review.

**Dependencies:** Tasks 1–3
