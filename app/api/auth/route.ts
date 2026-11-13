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
    if (body.action === 'verify') {
      const token = z.string().regex(/^\d{6,10}$/).parse(body.code);
      const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
      const headers = { 'Cache-Control': 'no-store' };
      if (error || !data.session || !data.user) return NextResponse.json({ error: error?.status === 429 ? 'Too many verification attempts. Please wait before trying again.' : 'That code is invalid or expired. Check the newest email or request a new code.' }, { status: error?.status === 429 ? 429 : 401, headers });
      return NextResponse.json({ signedIn: true, email: data.user.email }, { headers });
    }

    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: new URL('/auth/callback', request.url).toString() } });
    if (error) {
      const headers = { 'Cache-Control': 'no-store' };
      if (error.code === 'over_email_send_rate_limit' || error.message.toLowerCase().includes('email rate limit')) return NextResponse.json({ error: 'The email provider has reached its sending limit. Please pause retries and allow up to an hour before requesting one new sign-in code. Your email address is not the problem.', code: 'email_send_limit' }, { status: 429, headers });
      if (error.status === 429) return NextResponse.json({ error: 'Too many sign-in requests. Please wait a few minutes before trying once more.', code: 'request_limit' }, { status: 429, headers });
      if (error.code === 'email_address_not_authorized') return NextResponse.json({ error: 'Sign-in email delivery is not configured for this address yet. The app owner needs to configure a dedicated email sender.', code: 'email_delivery_setup' }, { status: 503, headers });
      return NextResponse.json({ error: 'The email service could not send a sign-in code. Please try again later.', code: 'email_delivery_failed' }, { status: 503, headers });
    }
    return NextResponse.json({ sent: true });
  } catch { return NextResponse.json({ error: 'Check the email address and any sign-in code, then try again.' }, { status: 400 }); }
}
