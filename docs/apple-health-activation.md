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

## Email delivery activation — 13 November 2026

The built-in Supabase email service returned `email rate limit exceeded` during sign-in. The app now explains email sending limits separately from other delivery errors. The email-return bridge supports implicit session fragments as well as the existing PKCE callback, validates the returned access token with Auth before persisting the session, removes tokens from browser history and displays callback failures.

Resend's **Free** transactional plan is active (3,000 emails/month, 100/day); paid transactional overages are off. The dedicated sending domain `auth.aifittraining.uk` is **Verified / Ready**. Three explicitly approved Cloudflare records were added: the generated public DKIM key at `resend._domainkey.auth`, DNS-only CNAME `rsend.auth` to `rsend-euw1.forge.rmta.net`, and DNS-only CNAME `send.auth` to `send.forge.rmta.net`, all with Auto TTL. The existing `app` A record remains `76.76.21.21`; no nameservers, root-domain policy or receiving-mail records were changed.

A dedicated Resend credential named **FitAi Supabase Auth** has Sending access limited to `auth.aifittraining.uk`. The user pasted it directly into the new FitAi project's SMTP Password field; it is not recorded in source or chat. The saved settings are sender **FitAi <no-reply@auth.aifittraining.uk>**, host `smtp.resend.com`, port `465`, username `resend`. Supabase confirmed the save and, after reload, custom SMTP is enabled and the stored password is hidden. Supabase's organization-wide Resend OAuth authorization was declined; this setup changes only the dedicated FitAi project's SMTP configuration.

The next user-requested email delivery and successful iPhone browser sign-in still need verification. No test email was sent by the agent and no email-link token was requested in chat.

## iPhone installation and remaining device verification

Full Xcode is now installed locally. The companion compiled against the local physical-iPhone SDK, was signed with an Apple-managed Personal Team development profile containing HealthKit and background-delivery entitlements, and passed signature verification. The profile expires **19 November 2026** and requires rebuilding/renewal after expiry.

Installation on the user's connected iPhone 14 Pro Max succeeded. The user enabled Developer Mode, trusted their development profile and confirmed that the companion opens. Its private Apple Health permissions, pairing, first live upload and OS-controlled background delivery remain unverified; do not claim live Watch sync until those device checks pass.

The native target also passed the unsigned iOS Simulator SDK build, generated-project check and 8 XCTest tests on [the free standard GitHub macOS runner](https://github.com/dineshu27/Rep-Rhythm/actions/runs/43199136138). Follow [the iPhone setup and device checklist](../ios/README.md). Developer Program membership is needed for TestFlight/App Store distribution; no enrolment or charge was made. Local Xcode signing settings remain local rather than committing the user's team configuration.
