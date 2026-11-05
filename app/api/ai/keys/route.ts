import { NextResponse } from 'next/server';
import { boundedJSON, sameOrigin } from '@/lib/account';
import { apiKeySchema, providerSchema, personalCookie, personalAIAvailable, personalSession, requestOrigin, sealPersonalKeys } from '@/lib/personal-ai';
import type { PersonalSecrets } from '@/lib/personal-ai';
export const runtime = 'nodejs';
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
function status(request: Request) { const session = personalSession(request); return { available: personalAIAvailable(), providers: { openai: !!session?.keys.openai, anthropic: !!session?.keys.anthropic }, expiresAt: session?.expires ?? null }; }
export async function GET(request: Request) { return json(status(request)); }
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Request origin was not accepted.' }, 403);
  if (!personalAIAvailable()) return json({ error: 'Personal key encryption is not configured yet.' }, 503);
  let provider; let key;
  try { const value = await boundedJSON(request, 2048); provider = providerSchema.parse(value.provider); key = apiKeySchema.parse(value.key); } catch { return json({ error: 'Choose a provider and enter a valid API key.' }, 400); }
  const session = personalSession(request);
  const keys: PersonalSecrets = { ...session?.keys, [provider]: key };
  const response = json({ saved: true, provider });
  response.cookies.set(personalCookie, sealPersonalKeys(keys, requestOrigin(request), Date.now(), session?.expires), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  return response;
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Request origin was not accepted.' }, 403);
  let provider: 'all' | 'openai' | 'anthropic';
  try { const value = await boundedJSON(request, 128); provider = value.provider === 'all' ? 'all' : providerSchema.parse(value.provider); } catch { return json({ error: 'Choose the connection to remove.' }, 400); }
  const session = personalSession(request);
  const keys = { ...session?.keys };
  if (provider !== 'all') delete keys[provider];
  const response = json({ removed: true });
  if (provider === 'all' || !Object.keys(keys).length) response.cookies.set(personalCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  else response.cookies.set(personalCookie, sealPersonalKeys(keys, requestOrigin(request), Date.now(), session?.expires), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  return response;
}
