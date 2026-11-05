# Personal AI, appearance and flexible training

## Personal provider connections

Use the connection panel in Settings or the assistant to add an OpenAI or Anthropic API key. Never put keys in chat. Saving does not validate a key with the provider and makes no provider request. Each chat submission requires sharing consent and confirmation that provider API charges may apply. Provider access, billing and usage limits remain the key owner's responsibility.

Keys are encrypted with AES-256-GCM on the server. The encrypted envelope is kept in a host-only HttpOnly, SameSite=Strict cookie (Secure in production); decrypted keys are never returned by the status endpoint. Each connection window has a maximum eight-hour expiry enforced on the server (adding or removing a provider does not extend it), is bound to its origin, and is invalidated by encryption-key rotation. It is a browser connection, not permanent account storage. Closing a normal browser session removes the session cookie, subject to browser session-restore behavior; the server expiry still applies. Remove each provider connection in the panel to disconnect. Successful account sign-out also clears the key cookie.

Connected provider keys and conversations are not written to localStorage, fitness exports, Supabase or application logs. The raw key is transmitted only in the password-form HTTPS request to this app, then in the selected provider's required server-side authentication header. This app can decrypt its cookies while processing requests; administrators controlling the encryption key must be trusted. Connections are isolated by browser and host; the app creates no shared database of user provider keys.

The chat keeps the most recent 30 displayed messages in memory for the page session and sends only the latest eight completed, non-example messages as context. Weekly review additionally sends the displayed aggregate facts after consent. No automatic upload of the entire workspace, private activity notes, account profile or photos occurs. Providers process submitted information under their own data policies. Clearing the UI does not delete data already sent to a provider.

Provider endpoints are fixed: OpenAI Responses (`gpt-5.4-mini`, `store:false`) and Anthropic Messages (`claude-sonnet-5-5`). There is no custom endpoint, automatic model fallback or automatic retry. Inputs are capped at 24,576 bytes; each response at 2,500 output tokens and a 30-second timeout. Stop waiting cancels the app's request where possible, but does not promise a refund or cancellation of provider-side usage. Invalid, refused or incomplete results are not saved. Review cards still require explicit user save. Personal-key calls do not spend the app's shared OpenAI key or use its global request allowance; they use the selected personal key's provider billing. Set appropriate provider spending limits.

Deployment requires `PERSONAL_AI_ENABLED=true` and `AI_KEY_ENCRYPTION_KEY` containing a securely generated random 32-byte base64 value, server-only. Use separate sensitive encryption keys for Preview and Production. These are encryption keys, not provider API keys. Never use NEXT_PUBLIC variables. Disabling the flag blocks personal-key generation; rotating the encryption key invalidates all existing connection cookies. The app-funded flags remain independent.

Implementation follows [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) and [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). Anthropic receives a simplified JSON schema; the complete bounded Zod schema and known exercise IDs are validated locally after either provider returns. No paid provider calls are made by the automated tests.

## Appearance

Settings offers six presets and a custom colour input, with independent light/dark mode. The colour and mode persist in this browser and restore before initial paint. Foreground accents are adjusted to maintain at least 4.5:1 contrast against their main surfaces. The fixed brand icon and semantic nutrient colours remain separate from the selected accent.

## Weekly training

The exercise catalogue now classifies direct targets as Chest, Shoulders, Back, Legs, Biceps, Triceps or Core. The weekly coverage display deduplicates days, excludes indirect involvement, and identifies unclassified custom exercise names rather than guessing. The default coverage target is two days; it is a planning display, not a record of completed training or a medical prescription.

Editable starter splits include upper/lower four days, mixed pairs four days, and chest+shoulders / back+legs / arms+core repeated across six days. Each starter directly schedules all seven listed groups on two distinct days. Plans can be added, removed and edited; the last plan and an active session's plan are protected. Replacing a split requires confirmation and cannot happen during an active session. History snapshots stay intact, including when their original plan is removed. Existing saved plans and storage formats are preserved; nothing is replaced automatically.
