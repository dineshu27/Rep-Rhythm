# Next review

## Ready to review

- Editable profile, onboarding, timezone, independent nutrition targets, and optional water/step goals.
- Food library search, custom source values, gram-based diary logging, corrections/deletion, and immutable nutrition snapshots.
- Editable seven-day meal planning with actual ingredient references and explicit diary logging.
- Four editable upper/lower workout plans, set logging, timed holds, persistent rest deadlines, resumable sessions, notes and editable history.
- Recharts weight chart, weight/waist measurements, seven-day summaries and daily steps/water/cardio records.
- Complete local export/import, corrupt-data preservation, storage error handling, and explicit local-data deletion.
- Public offline shell, install icons and production-build desktop/mobile tests.
- Supabase email auth, session refresh, manual account save/load/export, recent-auth account deletion and normalized server-side validation code.
- Transactional normalized PostgreSQL migration with owner-scoped RLS, ownership-aware FKs and optimistic account revisions.

## Verification

Lint, TypeScript and the production build pass. All 42 unit/database checks and 30 browser/accessibility checks pass. Local PostgreSQL tests cover every normalized collection, RLS reads across all tables, denied cross-owner writes, anonymous denial, atomic rollback, stale revisions and recent-auth deletion. Offline reload preserves browser records. Production dependency audit: zero reported vulnerabilities; full development-tool audit has existing advisories.

## Remaining external work

1. Install/authorize the Supabase connection and confirm the intended project. No old backend credentials have been copied and no remote migration has been applied.
2. Apply the reviewed migration, configure public project URL/publishable key directly in Vercel, allow the exact auth callback, and test hosted sign-in/synchronization with two actual users. Do not claim hosted auth or RLS verification from the local identity simulation.
3. Test PWA installation on actual iOS/Android devices and perform manual screen-reader/keyboard checks.
4. Optional AI is not enabled. It still needs a selected provider, server-only credentials, reviewed estimate behavior, quotas and paid-use authorization. No AI requests have been made.

## Suggested review flow

Open the live app, finish onboarding, create a food from a real package, log a portion, plan/log an ingredient-based meal, complete a workout, and record weight and daily activity. Check the dashboard and progress page, export a complete backup, then review backend activation. Use a separate browser profile if you want to test without mixing with existing local records.

## Rollback

The previous Rep-Rhythm shell is commit `adff7a03728c83f440d5b3fff6aaca6711ee61c9`, deployment `dpl_J34kEZ2RFgCu1mD789KhB1ctPHFi`. The older app remains in Vercel project `code`, deployment `dpl_FP8mH5e2oWnn7MfFQE4ntoM9eeES` (`code-hbcvlrb1y-dineshu27s-projects.vercel.app`). Neither the `strato` repository nor those older projects/deployments have been deleted or changed by this implementation. Keep backups before any data restore; browser data is independent of deployment rollback.

## Gram-based food and exercise update

The food entry form now previews calories, protein, fat, carbs and fiber as grams change. Eight sourced USDA starter foods cover cooked rice, dry oats, raw chicken breast, apple, boiled chickpeas/lentils, hard-boiled egg and raw broccoli. Existing records without fiber load normally and are marked not recorded. The follow-up SQL migration preserves the same distinction.

Workout editors now provide predefined upper/lower/core selections. Choose reps and rounds (sets) per exercise; completed rounds can be recorded together and edited individually afterward. The tracker computes total reps and kg rep volume.
