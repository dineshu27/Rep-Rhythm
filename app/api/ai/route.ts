import { NextResponse } from 'next/server';
import { accountClient, boundedJSON, sameOrigin } from '@/lib/account';
import { aiRequestSchema, assistantModes, exampleDraft } from '@/lib/assistant';
import { aiConfigured, generateDraft } from '@/lib/ai-provider';
import { searchFoods } from '@/lib/food-search';

export const runtime = 'nodejs';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
function matched(draft: ReturnType<typeof exampleDraft>) { return { ...draft, matches: draft.foods.map(row => searchFoods(row.query).foods.slice(0, 3)) }; }
export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get('example');
  if (mode && assistantModes.includes(mode as typeof assistantModes[number])) return json(matched(exampleDraft(mode as typeof assistantModes[number])));
  if (!aiConfigured()) return json({ ready: false, reason: 'Live AI is not enabled. You can try examples and keep tracking manually.' });
  const { client, user, response } = await accountClient();
  if (response) return json({ ready: false, reason: 'Sign in to an approved AI account. Cloud account setup is required.' });
  if (user.app_metadata.ai_access !== true) return json({ ready: false, reason: 'Your account has not been granted AI access.' });
  const { data, error } = await client.rpc('fitness_ai_quota');
  if (error) return json({ ready: false, reason: 'AI usage controls are not available yet.' });
  return json({ ready: data.dailyRemaining > 0 && data.monthlyRemaining > 0, quota: data, reason: 'AI allowance: 5 attempts per day per approved account, 50 per month across this app. Failed attempts count.' });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Request origin was not accepted.' }, 403);
  if (!aiConfigured()) return json({ error: 'Live AI is not enabled. No AI request was made.' }, 503);
  let input;
  try { input = aiRequestSchema.parse(await boundedJSON(request, 16_384)); }
  catch { return json({ error: 'Check your description and sharing consent.' }, 400); }
  const { client, user, response } = await accountClient(); if (response) return response;
  if (user.app_metadata.ai_access !== true) return json({ error: 'AI access is not enabled for your account.' }, 403);
  const { error } = await client.rpc('fitness_reserve_ai_request', { request_id: crypto.randomUUID(), request_kind: input.mode });
  if (error) return json({ error: 'AI allowance is exhausted or usage controls are unavailable. No AI request was made.' }, 429);
  try { return json(matched(await generateDraft(input))); }
  catch { return json({ error: 'The assistant could not produce a valid draft. Nothing was saved. This attempt counts toward your allowance.' }, 502); }
}
