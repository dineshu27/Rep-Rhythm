# FitAi iPhone companion

Native SwiftUI iPhone app (iOS 17+) with read-only Apple Health access. It reads steps and completed workouts already available on the iPhone, including synced Apple Watch records, and uploads permitted data to the existing FitAi website. No watchOS app is required for this first version. This is source code, not a signed IPA or TestFlight release.

## Current build status

The Mac currently has Command Line Tools and Swift 6.4, but **no local full Xcode or iOS SDK**. The companion has now passed a **real iOS Simulator SDK build and 8 native XCTest tests** on GitHub’s standard macOS runner: [successful native verification](https://github.com/dineshu27/Rep-Rhythm/actions/runs/43199136138). The generated Xcode project check also passed. The public-repository workflow uses read-only permissions, no secrets, no paid/larger runners and no artifact uploads; it skips if the repository becomes private.

This verifies compilation and native sync-core tests. It is **not a signed device build or proof of live Apple Watch sync**. Signing, iPhone installation, HealthKit permission behavior and real background delivery still require a device test. The Foundation-based standalone checks also compile and run locally. Local XCTest needs full Xcode on this Mac; the simulator cannot validate HealthKit background delivery.

```sh
python3 ios/scripts/generate_project.py
swift run --package-path ios/FitAiCompanion/SyncCore --scratch-path /tmp/fitai-swift-build FitAiSyncChecks
# After installing full Xcode and selecting it:
swift test --package-path ios/FitAiCompanion/SyncCore
xcodebuild -project ios/FitAiCompanion/FitAiCompanion.xcodeproj -scheme FitAiCompanion -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Open [FitAiCompanion.xcodeproj](FitAiCompanion/FitAiCompanion.xcodeproj) in Xcode. Select an authorized development team in Signing & Capabilities. The bundle identifier starts as `uk.aifittraining.companion`; change it if that identifier is unavailable to your team. HealthKit and HealthKit Background Delivery entitlements must be present in the provisioning profile. Xcode generates signing assets through the user’s Apple account; never paste certificates, passwords or keys in chat. Developer Program membership is needed for TestFlight/App Store distribution. Do not purchase or enrol without explicit user approval; check the capabilities available to the selected team for personal-device development.

The Xcode project uses a local Swift package and no external package dependencies. App artwork reuses the existing FitAi icon. `ios/scripts/generate_project.py` regenerates the checked-in project deterministically. No Apple team ID, signing certificate, Supabase key or device bearer token is committed.

## First run after backend and signing setup

1. Install a signed build on the iPhone paired with the Apple Watch. In the companion, choose Apple Health permissions for **steps and workouts only**.
2. Sign in at `https://app.aifittraining.uk/auth` in a browser. Open **Watch & steps**, review upload consent and generate a private pairing code.
3. Open the companion link or paste the code in the app. Codes expire after five minutes and can be used once. The companion shows the paired account before uploading.
4. Enable **Automatically sync to my FitAi account**. Pairing alone never enables uploads. Run **Sync now** and verify the server-received timestamp and the website’s received records.
5. Record a real Watch workout, let it reach Apple Health on iPhone, then verify its UUID is imported once. Compare steps to Health and repeat sync to check that a daily total is replaced rather than added.

Apple controls background scheduling. Steps have an hourly maximum frequency on iOS; workout observation requests immediate delivery but is not a real-time guarantee. Data can be unavailable while the phone is locked, offline or force-quit. Foreground activation retries. Observer completion handlers always run. No continuous background timer, workout session or location permission is used to keep the app alive.

## Data and reliability

- Read permissions: step count and workouts. No HealthKit write permission, heart rate, routes, sleep, food, active energy or calories.
- Steps use HealthKit cumulative statistics with calendar day boundaries in the profile timezone captured at pairing. Sources are not manually summed. A day with no readable quantity is omitted, never converted into a zero. Re-pair after a profile timezone change.
- Workouts use anchored queries, bounded pages and stable HealthKit UUIDs. Workout type, start/end, duration and source are uploaded; sets, repetitions, weight and calories are never invented. The first sync includes up to 31 calendar days, with incremental changes thereafter. The server serves recent workouts; native paging limits a single background run and continues from the last acknowledged anchor on a later activation.
- Deleted workout UUIDs are sent as explicit tombstones. Anchors advance only after every upload in a page is acknowledged. A failed or timed-out request preserves its checkpoint; retrying is safe because the server upserts UUIDs and replaces daily totals. No hidden HTTP retry or redirect is allowed.
- Permission request completion does not prove read access was granted. HealthKit deliberately hides denied read access; empty responses preserve previous uploads and show an explanation. Revoking Health read permission stops future readable data, not previously imported records. Disconnect the iPhone in FitAi to revoke server access immediately.
- The iPhone token and workout anchor live in Keychain with `AfterFirstUnlockThisDeviceOnly`. UserDefaults holds only consent flags and the last receipt time. The app does not store raw Health samples or use iCloud backup for its token. Networking uses a fixed HTTPS origin, ephemeral cookie-free sessions and no redirects. Tokens are headers, never URL parameters. No analytics or AI requests are made by the companion.
- Pausing stops further uploads; a request already in flight can finish. Disconnect pauses first, then revokes the server token. If offline, the UI says revocation was not confirmed and provides the website route. Existing imports stay unless the owner explicitly removes them on the website.

## Backend

See [Apple Health backend and web integration](../docs/apple-health-companion.md). A dedicated user-approved Supabase project must be configured; this change never copies an older app’s Supabase environment or credentials. Existing browser data stays local, and account snapshot save/load remains a separate explicit action.

## Required iPhone verification before distribution

Build against the real iOS SDK, sign with a HealthKit-capable profile, and test allow/deny/partial permission, locked-phone reads, Watch-to-iPhone delay, offline upload/retry, repeated sync, workout deletion, app relaunch, server revocation, timezone/DST boundaries and pause/disconnect during a pending upload. No background delivery claim can be verified from the standalone core tests or simulator alone.

References: [HealthKit setup](https://developer.apple.com/documentation/healthkit/setting-up-healthkit), [read authorization and privacy](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data), [background delivery](https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery(for:frequency:withcompletion:)), [supported iOS capabilities](https://developer.apple.com/help/account/reference/supported-capabilities-ios).
