# FitAi / Rep-Rhythm

A Next.js fitness workspace for profile preferences, food and meal planning, workouts, and progress. Core tracking works without Supabase configuration and stores records in the current browser. Optional account storage uses normalized PostgreSQL tables and Supabase authentication.

## Quick logging

- **Food:** search or choose Recent → enter grams → Add. Repeat yesterday’s meal, edit entries inline, or undo a removal. Package labels and saved-food management are secondary.
- **Workouts:** select exercises and start without creating a routine, or record completed sets in one form. Previous set values are shown for review; routines and weekly splits are still available.
- **Chat:** describe food in grams, completed sets and daily steps in one conversation. Clear reports save automatically with editable receipts and Undo; missing details require clarification or review. Basic logging needs no key; connected personal models require sharing and billing consent. Planning tools remain under Planning & coaching.
- **Home:** personalised greeting, recorded nutrition and seven-day visuals, optional city/current-area weather, and quick daily actions.
- **Watch & steps:** daily CSV import plus a native iPhone HealthKit companion and private account pairing/sync endpoints. Received Apple Health totals appear on Home, Progress and separate workout history. The dedicated backend is active and the native SDK build is verified; signed iPhone installation and real-device sync testing remain. Google sync is not configured.
- **Appearance:** the selected colour also updates the app logo, favicon and install manifest. Installed mobile icon refresh timing depends on the browser/OS.

See [workflow details and limits](docs/simple-logging.md) and [chat, weather and watch setup](docs/daily-companion.md).

See the [iPhone companion source and build status](ios/README.md) and [private Health sync setup](docs/apple-health-companion.md).

## Run locally

Use Node 24 (the tested runtime) and the committed lockfile:

```sh
npm ci
npm run dev
```

For a production build, run `npm run build`, then `npm start`. The Vercel project is `rep-rhythm`, linked to `dineshu27/Rep-Rhythm`. The public domain is [app.aifittraining.uk](https://app.aifittraining.uk).

## Implemented routes

| Route | Behavior |
| --- | --- |
| `/` | Personal greeting, optional weather, actual nutrition and seven-day visuals, quick logging and session resume |
| `/onboarding` | Editable profile, timezone, independent nutrition targets and optional activity goals |
| `/assistant` | Unified food, completed-workout and daily-step chat; automatic clear logs, review, edit and undo receipts |
| `/assistant?view=coach` | Meal ideas, workout plans and weekly coaching; personal OpenAI/Anthropic connections |
| `/connections` | Daily step CSV preview/import and honest Apple/Google connection setup status |
| `/settings` | Appearance and custom colours, personal AI keys, profile, backups and data controls |
| `/food` | Searchable user food library, per-100-g source values, gram portions, live calorie/protein/fat/carb/fiber calculations, diary edit/delete, immutable food snapshots |
| `/meals` | Seven-day navigation, editable meal ingredients, calculated nutrition and explicit ingredient logging |
| `/workouts` | Quick sessions, completed-exercise logging, searchable exercises, editable routines, weekly splits and history |
| `/workouts/active` | Reps, kg, timed holds, rest timer, notes, resume, finish, and set corrections |
| `/progress` | Weight/waist history, Recharts weight plot, seven-day averages, steps, water and cardio/recovery minutes |
| `/auth` | Email sign-in and manual account save/load/export/deletion when configured |
| `/prototype` | Original tracker preserved with its separate storage key and legacy schema |

Foods can be entered from packaging/reference values or added from eight bundled USDA FoodData Central starter entries. Each starter names its preparation state and source ID. Search all foods queries a server-side index of 13,585 USDA ingredients and prepared meals; Search saved foods filters the personal library. The indexed catalogue needs no external API key. Saved foods remain available offline. Label-based records are user-entered values, not independently verified nutrition. Estimates are marked separately. Diary nutrition uses a saved food snapshot, so editing a library food does not rewrite previous meals. Planned meals reference current ingredient records; logging copies their current values into diary snapshots.

The supplied initial profile and targets remain editable preferences. The app does not calculate a medical calorie prescription. Missing activity/weight records remain unlogged; seven-day weight and food averages exclude missing days. Food targets are independent of workout energy. See [workout details](docs/workout-phase.md) for timers, logging conventions, and bounds.

## Data and privacy

Browser records use `fittrack-workspace-v1` and `fittrack-workouts-v1`. They are local to the current browser profile and origin. The custom domain, Vercel URL, and localhost have separate records. Other people using the same browser profile can access those records. Signing in/out does not automatically upload or clear them. Settings exports both stores in one validated JSON backup; import asks before replacing them. Recovery exports preserve corrupt raw records. The prototype remains separate.

Account synchronization is manual and replaces a complete account snapshot or complete browser snapshot after confirmation. A revision check prevents overwriting a newer account save. The database stores normalized records; the JSON bundle is a transport/export format, not a legacy JSON-backup table. Owner-scoped RLS, ownership-aware foreign keys, authentication checks, request bounds, and same-origin mutation checks apply. Sign-out leaves browser records in place; clear them through Settings on a shared device.

## Backend activation

A new dedicated **FitAi** Supabase project (`iqkxlzlloqvmwykkpbqf`, London) has been created at a quoted $0 monthly project cost. The fitness, fiber, Apple Health and explicit RPC-permission migrations have been applied there as one atomic initial migration. Auth URLs point only to the production FitAi domain and its exact callback. No old project, database, environment file or credentials were copied or changed. Browser records remain local unless explicitly saved to an account.

See the [activation and security review](docs/apple-health-activation.md). The following steps describe configuration for a new environment:

1. Confirm the intended Supabase project through the connected integration.
2. Review and apply [the normalized migration](supabase/migrations/202611040001_fitness.sql), followed by [the fiber migration](supabase/migrations/202611040002_food_fiber.sql). It creates named tables in `public`; it will fail rather than replace existing conflicting tables.
3. In Supabase Auth URL settings, set the site URL to `https://app.aifittraining.uk` and allow `https://app.aifittraining.uk/auth/callback`. Add a localhost callback only if local auth testing is needed.
4. Configure these **public** values directly in Vercel's environment settings (and `.env.local` for local auth if needed):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Never use a secret or service-role key in browser variables. No service-role key is required by the app. No credentials should be shared in chat. Redeploy after setting public configuration.

5. Verify real email sign-in, callback/session renewal, save/load from two accounts, cross-user isolation, exports and recent-authentication deletion in the intended hosted project before claiming the cloud phase is production verified.

The local PostgreSQL tests simulate Supabase identity roles and exercise real RLS, transactions, FK checks and deletion behavior. They do not test Supabase's hosted email delivery or cookie/session behavior end to end. Cloud activation remains pending while the integration is unconnected.

## Offline and installation

The production service worker precaches public pages and their static chunks. Browser tracking can reload offline after installation. Account/auth/API responses are never cached and cloud actions require a connection. The manifest includes regular, maskable and Apple raster icons. Browser-level offline reload is tested; installation and background behavior on real iOS/Android devices still need device checks. Bump the named shell/asset caches in `public/sw.js` when changing the offline shell in a later release.

## Validation

```sh
npm run lint
npm test
npm run typecheck
npm run build
PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_PRODUCTION=1 npm run test:e2e -- --workers=2
```

Playwright uses port 3104. Set `PLAYWRIGHT_CHANNEL=chrome` for installed Chrome. Alternatively run `npx playwright install chromium` and omit that variable. `PLAYWRIGHT_PRODUCTION=1` requires a completed build; otherwise the runner starts the development server.

Validation covers unit/database/API checks and full desktop/mobile browser workflows, including automated accessibility checks. The production dependency audit is clean; development-tool advisories remain in the full audit. Automated accessibility checks do not replace manual assistive-technology testing.

## Phase status and next review

See [the review handoff](docs/next-review.md). Profile, nutrition, meals, workouts, progress and local release checks are implemented. Normalized account storage and auth code are ready for hosted activation/verification. The assistant provides a key-free Basic helper for food parsing, catalogue starters and recorded weekly summaries; connected provider keys enable conversational model responses. Personal OpenAI/Anthropic connections use server-encrypted eight-hour cookies and do not require Supabase. App-funded OpenAI remains independently disabled pending account/quota setup and cost approval. Automated provider tests are mocked; a real provider round-trip requires a user-supplied key and explicit request consent. See [personal AI, appearance and flexible training](docs/personal-ai.md) and [app-funded activation](docs/ai-assistant.md).

The old `dineshu27/strato` repository, Vercel project `code`, and its deployments remain available. This repository's `supabase/schema.sql` belongs only to `/prototype`; do not apply it as the normalized production schema.

Food portions scale each per-100-g value by grams ÷ 100. Fiber missing from an older food or snapshot remains unknown, not zero; totals are marked not recorded when any contributing food lacks fiber. Workout plan editors include upper/lower/core exercise selections and rounds (sets). Completed rounds can be logged together with identical reps/load; they remain individually editable. Rep totals and kg rep volume are calculated from the entered records, without inferring exercise calories.

## Broad food search

Use **Food diary → Add food** to find ingredients and dishes such as banana, cooked rice, dosa, paneer, curry or biryani. Enter grams directly beside a search result and tap **Add**. The result is saved in the personal library; choosing a previously saved item uses the saved values and preserves edits. Results paginate in groups of 20. Search supports some common UK names, including aubergine, courgette and yoghurt.

The server bundles a compact USDA SR Legacy, Foundation and FNDDS index. It does not send queries to an external nutrition service. The index includes only foods with complete calorie/protein/fat/carbohydrate values per 100 g; unknown fiber remains unknown. These are reference estimates, not verified nutrition for every brand or homemade recipe. Exact products and missing foods can still be entered from a label. See [dataset provenance and rebuild instructions](data/README.md).
