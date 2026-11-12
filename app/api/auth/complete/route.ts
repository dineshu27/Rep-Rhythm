import { NextResponse } from 'next/server';
import { z } from 'zod';
import { boundedJSON, sameOrigin } from '@/lib/account';
import { serverSupabase } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers });
  const client = await serverSupabase();
  if (!client) return NextResponse.json({ error: 'Cloud sign-in is not configured.' }, { status: 503, headers });
  try {
    const tokens = z.object({ access_token: z.string().min(1).max(8192), refresh_token: z.string().min(1).max(4096) }).strict().parse(await boundedJSON(request, 16384));
    // Validate with Auth before persisting a session; never trust decoded JWT claims.
    const { data, error } = await client.auth.getUser(tokens.access_token);
    if (error || !data.user) return NextResponse.json({ error: 'This sign-in link is invalid or expired. Request a new link.' }, { status: 401, headers });
    const result = await client.auth.setSession(tokens);
    if (result.error || !result.data.session || result.data.user?.id !== data.user.id) {
      await client.auth.signOut({ scope: 'local' });
      return NextResponse.json({ error: 'Could not finish sign-in. Request a new link.' }, { status: 401, headers });
    }
    return NextResponse.json({ signedIn: true }, { headers });
  } catch {
    return NextResponse.json({ error: 'Could not finish sign-in. Request a new link.' }, { status: 400, headers });
  }
}
