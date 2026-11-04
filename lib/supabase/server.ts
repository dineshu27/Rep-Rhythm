import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { hasSupabaseConfiguration } from '@/lib/config/environment';

export async function serverSupabase() {
  if (!hasSupabaseConfiguration()) return null;
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: values => { for (const { name, value, options } of values) cookieStore.set(name, value, options); } },
  });
}
