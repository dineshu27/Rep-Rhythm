# FitAi companion activation record

- Dedicated Supabase project: **FitAi**, reference `iqkxlzlloqvmwykkpbqf`, region `eu-west-2` (London).
- New-project quote: **$0/month**. No paid upgrade, Apple membership purchase or paid AI request was made.
- API URL: `https://iqkxlzlloqvmwykkpbqf.supabase.co`.
- Public schema was inspected and empty before applying the reviewed account/Health schemas.
- The four migration files listed in [the protocol guide](apple-health-companion.md) were applied atomically through Supabase as `fitai_initial_schema`. Supabase’s migration history therefore records the consolidated initial migration rather than four separate history entries.
- Supabase Auth Site URL: `https://app.aifittraining.uk`.
- Exact redirect allowlist entry: `https://app.aifittraining.uk/auth/callback`. No wildcard or localhost redirect was added.
- Rep-Rhythm Vercel configuration uses only this new project’s public URL and modern publishable key. No service-role key is used or committed. API/provider key encryption configuration remains unchanged.
- No existing project, database or deployment was removed or paused. Manual browser records are unchanged; enabling account configuration does not automatically upload them.

## Security advisor review

All 18 public tables have row-level security enabled. Live permission checks confirm that `anon` cannot load account or Health snapshots or read the device table, and signed-in users cannot read pairing hashes directly. No accounts or Health records were created as synthetic production test data.

Supabase flags the three native device RPCs as [anonymous SECURITY DEFINER functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). This exposure is intentional: redemption requires a high-entropy, single-use, expiring code; ingestion and disconnect require the raw scoped iPhone token. Raw credentials are hashed inside PostgreSQL and only hashes are stored, so a stored hash cannot be replayed. The token cannot read account records. Wrong/revoked tokens, cross-owner operations, replay, stale requests and transactional rollback are tested against PostgreSQL.

The owner-only Health pairing/load/revoke functions and the existing fresh-sign-in account-deletion function trigger [authenticated SECURITY DEFINER notices](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). These operations intentionally validate `auth.uid()` before operating on that owner’s records. The account-deletion path additionally requires recent sign-in and explicit UI confirmation.

The four Health tables trigger [RLS enabled/no policy informational notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). They deliberately have no direct table grants and no direct row-access policies: the default is deny-all, with narrow credential/owner-checked RPCs as the only access path. These are reviewed intentional notices, not a claim that the advisor returns no findings.

## Remaining iPhone gate

Full Xcode and its iOS SDK are not installed locally. The native target now passes a real unsigned iOS Simulator SDK build, its generated-project check and 8 XCTest tests on [the free standard GitHub macOS runner](https://github.com/dineshu27/Rep-Rhythm/actions/runs/43199136138). The workflow uses read-only permissions, no secrets or artifact uploads, and skips if the repository becomes private. Standard hosted runners are [free for public repositories](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

The app is not yet signed, installed or tested with real Apple Watch data. Background HealthKit delivery cannot be verified in the simulator. Follow [the iPhone installation and device checklist](../ios/README.md). Developer Program membership is needed for TestFlight/App Store distribution; no enrolment or charge was made. The next step is Xcode signing and installation on the user’s iPhone, then permission and real-sync verification.
