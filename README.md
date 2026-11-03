# FitTrack AI

Mobile-first fitness tracking application built in explicit phases. **Phase 1 implements the responsive app shell and project structure.** It is not yet a production health-record system. No deployment, database migration, or paid service has been started.

## Run on your Mac

Node.js 20.9 or newer is required. Your Mac has Node 24. Dependencies for the current shell are installed and pinned in `package-lock.json`.

```bash
cd /Users/diul/Documents/Rep-Rhythm
npm install
npm run dev
```

Keep Terminal running and open **http://localhost:3000** after Next.js prints `Ready`. If Next.js selects another port, open the exact URL it prints. Stop with Control-C.

If localhost says connection refused, the server is not running. Run the commands in your own Mac Terminal: this agent session cannot bind local ports (`listen EPERM`). The address must use `http://`, not `https://`. If the page reports an application error, copy the error shown in Terminal.

For a production build:

```bash
npm run build
npm start
```

## Phase 1: implemented

- Next.js App Router route group with shared responsive shell.
- Desktop sidebar, five-link mobile bottom navigation, and links from Home to meal planning and onboarding. Active workout is reachable from the desktop sidebar or `/workouts/active`; the mobile Workouts page establishes that upcoming flow.
- Route-based URLs, exact active navigation, direct links, reloads, and browser history.
- Home presenting the supplied starting targets and profile. No fabricated tracking records.
- Persistent light/dark theme preference, system preference on first visit, and a pre-paint theme initializer.
- Reusable shadcn/ui-derived Card components, Tailwind 4 theme tokens, and `components.json` for future components.
- Loading skeleton, route error boundary, empty/planned states, and 404 page.
- Keyboard focus styles, skip link, named navigation landmarks, and reduced-motion support.
- Zod starting-target schema; Vitest tests; ESLint; Playwright configuration and authored shell tests.
- PWA manifest and SVG icon as preparation. Full cross-device installation, raster/apple icons, service worker behavior, and offline support remain unimplemented/unverified.
- Vercel-compatible Next.js build and basic response security headers. No Vercel deployment has occurred.

The original local logging dashboard is preserved at **`/prototype`**, including the existing browser storage key. It remains a prototype: local logs are accessible to anyone using the same browser, sign-out does not clear them, and it lacks the new normalized data model and complete edit workflows. The new shell does not read or migrate those logs automatically.

## Routes

| Route | Current behavior |
| --- | --- |
| `/` | Responsive home shell and starting targets |
| `/auth` | Configuration-aware sign-in placeholder; no credential form |
| `/onboarding` | Planned onboarding screen |
| `/food` | Planned nutrition screen |
| `/meals` | Planned seven-day meal planner |
| `/workouts` | Planned workout planner |
| `/workouts/active` | Planned active-session screen |
| `/progress` | Planned analytics screen |
| `/settings` | Read-only supplied profile and target values |
| `/prototype` | Preserved original local logging dashboard |

Theme switching is implemented. Target/profile editing, server authentication, normalized persistence, food search, nutrition snapshots, meal ingredients, workout sets/timer, steps/water logging, and production export/deletion are later-phase work. Planned pages explicitly state their status.

## Profile and targets

Male, 37, 165 cm, starting weight 74 kg, goal weight 64 kg, moderate activity, four gym days per week, non-vegetarian, no stated restrictions. Starting targets: **1,900 kcal, 130 g protein, 60 g fat, 210 g carbohydrates**. These are user preferences, not medical prescriptions. They will become editable during the profile phase. The macro targets calculate to 1,900 kcal using 4/9/4 kcal per gram.

Defaults live in `lib/config/profile.ts`. Workout energy will not automatically reduce food totals or increase calorie targets. Estimated and verified nutrition will be distinct when the nutrition model is implemented. AI integration remains disabled until the core tracking app works.

## Supabase configuration

This checkout has no `.env.local`. Configure the intended backend before enabling cloud features:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Use the public **publishable key** from Supabase project API settings when configuring Phase 2. Never use a secret/service-role key in browser environment variables. `.env.example` contains only empty templates. On another checkout:

```bash
cp .env.example .env.local
```

Restart Next.js after environment changes. Missing credentials do not prevent using the shell. No database connection is required for Phase 1. `@supabase/ssr` is installed for the next authentication phase; server-side auth is not implemented yet.

`supabase/schema.sql` is the legacy JSON-backup schema used only by `/prototype`. **It is not the production database.** The new `supabase/migrations/` directory documents pending normalized migrations. Do not run legacy SQL as a substitute for Phase 2. No migration has been applied to the supplied project.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Phase 1 results: production build passed; nine Vitest tests passed. See `docs/phase-1.md` for verification details and limits.

Playwright shell tests cover mobile and desktop navigation, direct-route reloads, active links, overflow, theme persistence, planned states, and 404. Browser packages could not be installed in the agent session because npm registry DNS is unavailable. Install and run on your Mac with network access:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
npm run test:e2e
```

The Playwright config starts its own server at `http://127.0.0.1:3000`. Stop an unrelated app on that port first. Browser assertions and visual/accessibility checks have **not** been executed in this session. Recharts will be installed and used during analytics work; Phase 1 has no new charts.

## Structure

```text
app/(workspace)/        Shared shell and feature routes
app/prototype/          Preserved original tracker
components/layout/      Navigation and theme control
components/ui/          shadcn/ui-derived primitives
components/features/    Planned-feature state
lib/config/             Navigation, defaults, env checks, unit tests
supabase/migrations/    Future normalized database migrations
public/                 PWA icon
tests/e2e/             Playwright shell scenarios
```

## Implementation phases

1. **Foundation:** responsive shell, navigation, themes, components, states, test tooling, manifest preparation.
2. **Database + auth:** migrations for `profiles`, `nutrition_targets`, `foods`, `food_logs`, `meal_plans`, `exercises`, `workout_plans`, `workout_plan_exercises`, `workout_logs`, `exercise_sets`, `weight_logs`, `daily_metrics`; UUIDs, ownership foreign keys, indexes, numeric precision, UTC timestamps and user-local dates; authenticated user-scoped RLS; server-side Zod validation; onboarding and editable targets; account export/deletion.
3. **Nutrition:** food search/custom foods, gram portions, nutrition snapshots, full edit/delete, estimated/verified sources; editable seven-day meal plan linked to actual ingredient records.
4. **Workouts:** exact requested four-day upper/lower plan; sets/reps/load, timed planks, rest timer, session history, optional cardio/recovery.
5. **Dashboard + analytics:** persistent daily metrics, Recharts weight/trend views, seven-day averages, waist and weekly summaries.
6. **Release hardening:** RLS and authenticated workflow tests, Playwright verification, accessibility, complete PWA assets, Vercel deployment review. Deployment and any paid usage require user confirmation.
7. **Optional AI:** only after core workflows pass, with server-side credentials and reviewed nutrition estimates.

## Vercel preparation

Use the Next.js framework preset, `npm run build`, and the environment variables above when release-ready. Preview/production Supabase redirect URLs and cookie-based authentication must be configured in Phase 2. Do not treat the shell or legacy prototype as release-ready personal-data storage. No Vercel project, deployment, or paid resource has been created.

Framework references: [shadcn/ui manual setup](https://ui.shadcn.com/docs/installation/manual), [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps).
