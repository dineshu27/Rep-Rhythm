import { NextResponse } from 'next/server';
import { serverSupabase } from './supabase/server';

export { completeBackupSchema } from './backup-schema';
export function sameOrigin(request: Request) {
  const url = new URL(request.url); const origin = request.headers.get('origin');
  // Next.js may normalize the internal URL hostname. The HTTP Host is the
  // browser-facing authority; do not accept untrusted forwarded-host headers.
  return origin === url.origin || (request.headers.has('host') && origin === `${url.protocol}//${request.headers.get('host')}`);
}
export async function accountClient() {
  const client = await serverSupabase();
  if (!client) return { client: null, user: null, response: NextResponse.json({ error: 'Cloud configuration is not available. Browser tracking still works.' }, { status: 503 }) };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { client: null, user: null, response: NextResponse.json({ error: 'Sign in to access your account.' }, { status: 401 }) };
  return { client, user: data.user, response: null };
}
export async function boundedJSON(request: Request, maximum = 5_000_000) {
  if (Number(request.headers.get('content-length') ?? 0) > maximum) throw new Error('Request is too large.');
  if (!request.body) throw new Error('Missing request body.');
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > maximum) { await reader.cancel(); throw new Error('Request is too large.'); } chunks.push(value); }
  const result = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(result));
}
