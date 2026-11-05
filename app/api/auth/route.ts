import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/supabase/server';
import { personalCookie } from '@/lib/personal-ai';
import { boundedJSON, sameOrigin } from '@/lib/account';
export const dynamic = 'force-dynamic';
export async function GET() {
  const client = await serverSupabase();
  if (!client) return NextResponse.json({ configured: false, email: null }, { headers: { 'Cache-Control': 'no-store' } });
  const { data } = await client.auth.getUser();
  return NextResponse.json({ configured: true, email: data.user?.email ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const client = await serverSupabase(); if (!client) return NextResponse.json({ error: 'Cloud sign-in is not configured. Browser tracking still works.' }, { status: 503 });
  try {
    const body = await boundedJSON(request, 2048);
    if (body.action === 'signout') { const { error } = await client.auth.signOut(); if (error) throw error; const response = NextResponse.json({ signedOut: true }); response.cookies.set(personalCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 }); return response; }
    const email = z.email().max(254).parse(body.email);
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: new URL('/auth/callback', request.url).toString() } });
    if (error) return NextResponse.json({ error: 'The sign-in link could not be sent. Check your email and try again later.' }, { status: 429 });
    return NextResponse.json({ sent: true });
  } catch { return NextResponse.json({ error: 'Check the email address and try again.' }, { status: 400 }); }
}
