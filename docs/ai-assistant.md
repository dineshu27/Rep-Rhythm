# AI assistant

The assistant now supports a conversation interface and two separate credential paths. Personal OpenAI or Anthropic keys work without Supabase: see [personal AI connections](personal-ai.md). The original app-funded OpenAI path below remains disabled unless its approval, account and quota requirements are configured.

Four reviewable tools: text-to-food diary, workout suggestions from the exercise catalogue, ingredient-based meal ideas, and weekly coaching from a displayed seven-day summary. No records or targets are changed until explicit save. Example mode uses canned drafts, clearly marked; it makes no model calls. The food example can be saved as a real entry, only after review.

Food nutrition comes from matched USDA records or the user's existing library, never model-generated calories. Missing weighed portions remain blank and block saving. Preparation and recipe matches need user review. Meal idea portions are suggestions, not measured intake. Exercise suggestions use catalogue IDs, reps/seconds, rounds and rest, never prescribed loads. Saving replaces the selected plan only after confirmation; session snapshots are preserved.

## Activation (currently disabled)

The owner has required approval before paid usage. Do not enable these flags before explicit approval. No paid requests have been made during implementation. A hosted model round-trip remains unverified until activation.

1. Configure a **new** Supabase project using existing cloud setup instructions and all migrations, including `202611040003_ai_usage.sql`. Do not reuse credentials or environment files from the old app.
2. Configure public Supabase URL/publishable key in Vercel; enable email login and the correct callback URL. Verify real sign-in first.
3. After cost approval, create a dedicated OpenAI project/key in the OpenAI dashboard. Add `OPENAI_API_KEY` as a **server-only secret** in Vercel (never NEXT_PUBLIC, browser storage, source control, or chat). Set provider billing limits/alerts appropriate to the approved budget; application request counts are not a dollar billing cap.
4. Grant only intended users `app_metadata.ai_access: true` through the Supabase administrative dashboard/API. `user_metadata` is not accepted. Never place an administrative Supabase key in this app.
5. Set `AI_PAID_USAGE_APPROVED=true` and `AI_ENABLED=true` in Vercel production only after approval, redeploy, verify `/api/ai`, then perform one approved live draft request. Leave previews disabled unless separately intended.

Model: `gpt-6-luna`, OpenAI Responses API, structured output, 2,500 maximum output tokens, 30-second timeout, no automatic retry and `store:false`. User requests are capped at 24,576 bytes, descriptions at 2,000 characters. A sign-in, owner-granted AI access, explicit sharing checkbox, same-origin request and database quota reservation are required before every provider request.

The database serializes reservations with an advisory lock: 5 attempts per UTC day per approved user and 50 per UTC month across the entire app. Failures/timeouts count because a provider call may have incurred usage. Reservations are not linked to replaceable profile rows. Account deletion anonymizes reservations, preserving the global monthly allowance; only request ID, account ID until deletion, mode and timestamp are stored. No prompt, response, health records or API keys enter this ledger. Users cannot insert, edit or delete ledger rows. Service-role/owner access remains administrative.

The request contains only text explicitly entered by the user, plus the displayed summary for weekly review. No automatic upload of the full workspace, notes, photos, email or account profile. `store:false` disables Responses application storage; it is not a claim of zero provider retention. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

Disable immediately by setting `AI_ENABLED=false` and redeploying. Manual tracking, free USDA search, and existing records continue to work without any AI or Supabase configuration.

## Verification

Lint, TypeScript and the production build pass. 76 unit/database/API tests pass, with mocked provider calls covering approval, consent, authentication, administrative access, reservation ordering, failures and invalid responses. All 50 desktop/mobile browser cases pass across the full suite and corrected assistant rerun, including accessibility and review/save behavior. No actual model call was made. Hosted Supabase, live model quality and billing configuration remain unverified until activation.
