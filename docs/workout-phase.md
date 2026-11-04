# Workout phase: browser-local milestone

The four-day workout flow is implemented independently of Supabase. Cloud authentication and normalized database persistence remain future work. The workout milestone is included in the current release. Backend activation is tracked in `next-review.md`; no credentials have been copied.

## Using the tracker

- Open `/workouts` for Monday Upper A, Tuesday Lower A, Thursday Upper B, and Saturday Lower B.
- Each editable starter plan includes exercise names, rep or second targets, planned sets, and rest intervals. Add, remove, or reorder exercises and change the training day. Save the plan before starting it.
- Only one session can run at a time. Start a plan, log actual reps or seconds and kilograms, and resume it from either workout route after navigation or reload.
- Enter `0` kg for an unweighted set. Use combined dumbbell weight consistently. Rep volume is the sum of reps × recorded kg; timed holds are excluded. No calorie estimate or food-target adjustment is made.
- Planks have a hold stopwatch. Stop it to fill the seconds field, then log the set. The hold stopwatch is page-local and resets when leaving or reloading; already logged hold sets persist.
- Logging a new set starts that exercise's rest interval. Rest uses a saved deadline, so navigation, reload, or background throttling does not restart the countdown. Restart, extend by 30 seconds, or skip it. Completion is visual and announced in the page; it is not an operating-system notification.
- Amend or delete individual sets. Notes save on blur or with **Save notes**. Finish a session with at least one logged set, even if fewer than planned. History retains the exercise snapshot used for that session and allows set/note corrections or session deletion.
- Optional cardio and active recovery can be recorded in session notes. Structured cardio metrics and exercise demonstration videos are not implemented.

Starter exercise selection is a product default, not a previously supplied or personalized prescription. General rep-range context: [NHS strength and flexibility guidance](https://www.nhs.uk/live-well/exercise/how-to-improve-strength-flexibility/).

## Persistence and recovery

`fittrack-workouts-v1` stores a versioned, Zod-validated JSON record containing plans, an active session, history, and the rest deadline. It is independent of the old `/prototype` record. Records stay on the current browser and origin: localhost, the Vercel URL, and the custom domain have separate stores. There is no account isolation, cloud sync, or automatic backup.

Export a JSON backup before clearing browser data or changing devices. Import validates the entire file before requesting confirmation to replace workout data. Invalid files leave existing data intact. Imports are limited to 5 MB. Corrupt saved data is preserved and offered as a recovery download; it is not silently overwritten with defaults. Failed storage writes display an error and keep the previously saved state. Changes from another tab refresh the displayed records, with an additional freshness check before mutations.

Exercise snapshots protect sessions from later plan edits. Stored values have bounds, including 30 exercises per plan, 10 planned sets per exercise, 1,000 completed sessions, 1,000 sets per session, and 2,000 note characters. Browser storage may fill before these limits; export and remove older sessions when necessary.

## Validation

```sh
npm run lint
npm test
npm run typecheck
npm run build
PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_PRODUCTION=1 npm run test:e2e -- --workers=2
```

Playwright is now a declared development dependency. Tests use port 3104. Set `PLAYWRIGHT_CHANNEL=chrome` to use installed Google Chrome; otherwise install Playwright Chromium with `npx playwright install chromium`. `PLAYWRIGHT_PRODUCTION=1` runs against the production build, which must be built first. Without it, the test runner starts the development server.

Unit checks cover session transitions, immutable snapshots, invalid sets, timed holds, volume, chronology, and backup validation. Browser checks exercise desktop and mobile navigation, plan editing, logging and corrections, session resume, history, export/import, timers, corrupt storage, blocked writes, and synchronization between tabs. These checks do not establish authenticated cloud data isolation or real-device/offline PWA behavior.

Original workout milestone validation: lint, 23 unit tests, TypeScript, the production build, and 16 browser checks passed. See `next-review.md` for current combined checks. Desktop dark and mobile light screenshots were visually inspected; no browser page errors or mobile horizontal overflow were observed. Next.js, Zod, Vitest and compatible transitive dependencies were updated after inspecting advisories. The production dependency audit reports zero vulnerabilities; the full audit still reports existing development-tool advisories.
