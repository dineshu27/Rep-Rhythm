import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get('code'); const client = await serverSupabase();
  if (code && client) { const { error } = await client.auth.exchangeCodeForSession(code); if (!error) return NextResponse.redirect(new URL('/auth?connected=1', request.url)); }
  return NextResponse.redirect(new URL('/auth?error=callback', request.url));
}
