# Apple Health companion and private sync

The iPhone source lives in `ios/FitAiCompanion`. Home displays received Apple Health daily steps when their timezone matches the current profile. Progress shows the selected day’s received total with its timestamp, and its seven-day step total uses Apple Health for matching days or the manual total otherwise; it never adds both sources for the same day. Workouts has a separate **From Apple Health** history. Imported records never replace manual metrics, sets, plans, active workouts, food or backups. A workout recorded both manually and in Apple Health may appear in both lists; counts stay separate rather than attempting an unreliable automatic duplicate match. The seven-day training dots can include either source.

## Dedicated backend activation

The user requested a **new dedicated FitAi Supabase project**. Do not use or copy `strato`, an older database or an old environment file. Supabase project creation requires an explicit organization choice. Check the quoted cost for that organization and ask before any nonzero cost or upgrade. Do not delete, pause or alter other projects to make room for a new free project.

After the intended new project is created, inspect its tables. Apply the four checked-in migrations in order only to that empty, intended database:

1. `202611040001_fitness.sql`
2. `202611040002_food_fiber.sql`
3. `202611110001_apple_health.sql`
4. `202611110002_cloud_rpc_permissions.sql`

Set Supabase Auth’s site URL to `https://app.aifittraining.uk`, and allow `https://app.aifittraining.uk/auth/callback`. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` directly in the Rep-Rhythm Vercel project, using the new project’s URL and **publishable** key. Never put a service-role key in the client or companion. Use official account authorization screens, not secrets pasted in chat. If Preview uses this backend, add only its exact authorized callback URL; do not open wildcard redirects to arbitrary domains.

Health sync does not require a cloud fitness-profile snapshot to exist. Its records reference the authenticated owner directly, so saving a manual account snapshot cannot wipe imported Health data. Account deletion cascades to Health records and tokens through `auth.users`. Existing browser data is not automatically uploaded when cloud configuration is enabled.

## Protocol and authorization

- `POST /api/health/pair`: signed-in cookie session, same-origin check, valid timezone, explicit upload consent. Generates 256-bit random code; stores SHA-256 only, five-minute expiry, one outstanding code per owner. Replacement of an already paired iPhone requires explicit consent.
- `POST /api/health/pair/redeem`: one-time code and device label. The database consumes the code atomically and creates a separately random revocable iPhone token. Response is private/no-store. Keychain receives the raw token; only its hash is stored in the database. Custom app links contain only the short-lived pairing code, not the durable token. Keep pairing links private.
- `POST /api/health/sync`: native bearer token, no cookie identity. Validated versioned JSON, bounded body, timezone, clock drift, current/previous 30 days, unique daily totals, up to 200 workouts and 200 tombstones per batch. Identity comes from the token, never a client-supplied user ID. Transactionally upserts records and rejects older batches. Acknowledgement is returned only after database success.
- `GET /api/health`: signed-in owner only, no-store snapshot. No credentials/hashes are returned. Records remain private to their account.
- `DELETE /api/health`: same-origin signed-in owner can revoke a device. Explicit `erase:true` removes only records imported by that phone, after UI confirmation. Manual trackers stay untouched.
- `POST /api/health/disconnect`: the scoped iPhone token can revoke itself; it cannot read account records or operate on another account.

The migration grants no table access to `anon` or `authenticated`. Device RPCs hash the presented raw credential inside PostgreSQL before lookup, so a stored hash cannot be replayed as a credential. Narrow SECURITY DEFINER functions use an empty search_path and validate `auth.uid()` or possession of a high-entropy hashed device/code credential. All function default grants are explicitly revoked from PUBLIC, anon and authenticated before intended grants are applied. The three anonymous device RPCs are intentionally exposed to accept the native credential; possessing a Supabase publishable key alone gives no Health data access. Check advisors after activation and distinguish these intentional credential-validated RPCs from accidental public functions. No service role is used.

## Browser behavior

The pairing panel clearly distinguishes unconfigured cloud, signed out, waiting for first upload and last received sync. Opening Connections checks account status, not Apple Health permission. A browser checks for the signed-in owner’s received records once on startup. After a paired iPhone is found, a visible tab refreshes every 30 seconds and on focus, including a newly signed-in browser. This retrieves existing cloud imports; it never reads native HealthKit or uploads browser records. API responses are excluded from the service worker. Health data is held in memory, not persisted in browser localStorage or fitness backups. Only the opt-in refresh flag is persisted (`fitai-health-auto`). Sign-out clears in-memory Health data immediately; an expired session clears it on refresh. A failed network refresh can display the last received records with an explicit stale-data message in the Health views. Other people sharing a signed-in browser profile can see its data, as with existing browser records.

The companion does not send Health data to AI. This integration does not add imported records to the existing AI summary payloads. No Watch data is fabricated by the web app, and no connected status is displayed until a real paired device has uploaded successfully.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and the Chrome desktop/mobile Playwright suite. PostgreSQL tests create isolated roles including Supabase-style default function grants, then exercise expiry, replay, replacement, revocation, owner isolation, direct access denial, malformed batches and rollback. Native transport/date/paging checks run using the command in `ios/README.md`. Full iOS SDK, signing and actual HealthKit background delivery remain separate required device checks.
